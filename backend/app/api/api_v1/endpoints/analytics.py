from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from app.models.job import Job, JobStatus

router = APIRouter()


@router.get("/jobs/{job_id}/profile")
async def get_data_profile(job_id: str):
    """
    Get detailed data profile for a specific job
    """
    try:
        from app.models.job import Job
        from beanie import PydanticObjectId
        
        job = await Job.get(PydanticObjectId(job_id))
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
            
        target_path = job.output_path or job.file_path
        if not target_path:
             raise HTTPException(status_code=404, detail="File not found")
             
        import polars as pl
        import os
        from app.services.profiler import DataProfiler
        
        # Determine file type and read
        if target_path.endswith('.csv'):
            df = pl.read_csv(target_path, ignore_errors=True)
        elif target_path.endswith('.json'):
            df = pl.read_json(target_path)
        elif target_path.endswith('.parquet'):
             df = pl.read_parquet(target_path)
        else:
             # Fallback
             df = pl.read_csv(target_path, ignore_errors=True)
             
        profiler = DataProfiler(df)
        return profiler.get_profile()
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
async def get_dashboard_data():
    """
    Get aggregated dashboard analytics data.
    """
    try:
        import asyncio
        print("DEBUG: Request received for /dashboard")
        
        # Helper for Stats
        async def get_stats():
            print("DEBUG: Starting get_stats")
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "total": {"$sum": 1},
                        "completed": {
                            "$sum": {"$cond": [{"$eq": ["$status", JobStatus.COMPLETED.value]}, 1, 0]}
                        },
                        "failed": {
                            "$sum": {"$cond": [{"$eq": ["$status", JobStatus.FAILED.value]}, 1, 0]}
                        },
                        "processing": {
                            "$sum": {
                                "$cond": [
                                    {"$in": ["$status", [
                                        JobStatus.PROCESSING.value, 
                                        JobStatus.CLEANING.value, 
                                        JobStatus.VALIDATING.value, 
                                        JobStatus.QUEUED.value
                                    ]]}, 
                                    1, 
                                    0
                                ]
                            }
                        }
                    }
                }
            ]
            results = await Job.aggregate(pipeline).to_list(length=None)
            print("DEBUG: Finished get_stats")
            return results[0] if results else {"total": 0, "completed": 0, "failed": 0, "processing": 0}

        # Helper for Activity
        async def get_activity():
            print("DEBUG: Starting get_activity")
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=6)
            pipeline = [
                {
                    "$match": {
                        "created_at": {"$gte": start_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                        },
                        "count": {"$sum": 1}
                    }
                }
            ]
            daily_results = await Job.aggregate(pipeline).to_list(length=None)
            print("DEBUG: Finished get_activity")
            daily_map = {item["_id"]: item["count"] for item in daily_results}
            
            activity = []
            for i in range(7):
                d = start_date + timedelta(days=i)
                d_str = d.strftime("%Y-%m-%d")
                activity.append({
                    "date": d_str,
                    "jobs": daily_map.get(d_str, 0)
                })
            return activity

        # Helper for Volumetrics
        async def get_volumetrics():
            print("DEBUG: Starting get_volumetrics")
            vol_pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "total_rows_processed": {"$sum": "$processed_rows"},
                        "total_errors": {"$sum": {"$ifNull": ["$validation_summary.total_errors", 0]}}
                    }
                }
            ]
            vol_results = await Job.aggregate(vol_pipeline).to_list(length=None)
            print("DEBUG: Finished get_volumetrics")
            return vol_results[0] if vol_results else {"total_rows_processed": 0, "total_errors": 0}

        # Helper for Performance Metrics
        async def get_performance():
            print("DEBUG: Starting get_performance")
            # Get average upload and processing times from completed jobs
            perf_pipeline = [
                {
                    "$match": {
                        "status": JobStatus.COMPLETED.value,
                        "started_at": {"$ne": None},
                        "completed_at": {"$ne": None}
                    }
                },
                {
                    "$project": {
                        "upload_time": {
                            "$subtract": ["$started_at", "$created_at"]
                        },
                        "processing_time": {
                            "$subtract": ["$completed_at", "$started_at"]
                        }
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "avg_upload_ms": {"$avg": "$upload_time"},
                        "avg_processing_ms": {"$avg": "$processing_time"}
                    }
                }
            ]
            perf_results = await Job.aggregate(perf_pipeline).to_list(length=None)
            print("DEBUG: Finished get_performance")
            if perf_results:
                return {
                    "avg_upload_time": perf_results[0].get("avg_upload_ms", 0) / 1000,  # Convert to seconds
                    "avg_processing_time": perf_results[0].get("avg_processing_ms", 0) / 1000
                }
            return {"avg_upload_time": 0, "avg_processing_time": 0}

        # Execute in parallel
        print("DEBUG: Gathering results...")
        stats_res, activity_res, vol_res, perf_res = await asyncio.gather(
            get_stats(),
            get_activity(),
            get_volumetrics(),
            get_performance()
        )
        print("DEBUG: Gathering complete.")
        
        # Calculate success rate
        total = stats_res.get("total", 0)
        completed = stats_res.get("completed", 0)
        
        return {
            "stats": {
                "total": total,
                "completed": completed,
                "failed": stats_res.get("failed", 0),
                "processing": stats_res.get("processing", 0),
                "success_rate": round((completed / total * 100), 1) if total > 0 else 0
            },
            "activity": activity_res,
            "volumetrics": {
                "rows_processed": vol_res.get("total_rows_processed", 0),
                "errors_found": vol_res.get("total_errors", 0)
            },
            "performance": {
                "avg_upload_time": round(perf_res.get("avg_upload_time", 0), 2),
                "avg_processing_time": round(perf_res.get("avg_processing_time", 0), 2)
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_system_stats():
    # Keep legacy endpoint for now or redirect logic
    dashboard = await get_dashboard_data()
    return {
        "total_jobs": dashboard["stats"]["total"],
        "success_rate": dashboard["stats"]["success_rate"],
        "active_pipelines": dashboard["stats"]["processing"],
        "avg_processing_time": 0 # Placeholder as it requires complex calc
    }
