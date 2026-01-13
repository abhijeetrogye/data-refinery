"""
Field Matcher Service
- Provides confidence scores for schema field matching
- Uses fuzzy string matching and heuristics
"""
from difflib import SequenceMatcher
from typing import Dict, List, Tuple
import re


def calculate_similarity(str1: str, str2: str) -> float:
    """Calculate string similarity using SequenceMatcher (0-1)"""
    str1 = str1.lower().strip()
    str2 = str2.lower().strip()
    return SequenceMatcher(None, str1, str2).ratio()


def normalize_field_name(name: str) -> str:
    """Normalize field name for comparison"""
    # Remove common prefixes/suffixes
    name = re.sub(r'^(col_|field_|fld_)', '', name.lower())
    name = re.sub(r'(_id|_no|_num|_number)$', '', name)
    # Replace underscores and dashes with spaces
    name = re.sub(r'[_\-]', ' ', name)
    return name.strip()


# Common field name aliases
FIELD_ALIASES = {
    'name': ['full_name', 'fullname', 'customer_name', 'user_name', 'first_name', 'last_name', 'fname', 'lname'],
    'email': ['email_address', 'mail', 'e_mail', 'emailid', 'email_id'],
    'phone': ['phone_number', 'telephone', 'mobile', 'cell', 'contact', 'phone_no'],
    'address': ['street', 'street_address', 'addr', 'location', 'address_line'],
    'city': ['town', 'municipality'],
    'state': ['province', 'region'],
    'country': ['nation', 'country_name'],
    'zip': ['postal_code', 'zipcode', 'zip_code', 'pincode', 'postcode'],
    'date': ['dt', 'created_at', 'updated_at', 'timestamp', 'datetime'],
    'age': ['years_old', 'customer_age'],
    'gender': ['sex', 'male_female'],
    'amount': ['price', 'cost', 'total', 'value', 'sum'],
    'quantity': ['qty', 'count', 'num', 'number'],
    'id': ['identifier', 'key', 'pk', 'uid', 'uuid'],
    'status': ['state', 'condition', 'is_active'],
    'description': ['desc', 'details', 'info', 'notes', 'comments'],
}


def get_alias_match(source: str, target: str) -> float:
    """Check if fields match via known aliases"""
    source_norm = normalize_field_name(source)
    target_norm = normalize_field_name(target)
    
    for canonical, aliases in FIELD_ALIASES.items():
        all_names = [canonical] + aliases
        source_matches = any(a in source_norm or source_norm in a for a in all_names)
        target_matches = any(a in target_norm or target_norm in a for a in all_names)
        if source_matches and target_matches:
            return 0.85  # High confidence for alias match
    return 0.0


def match_field_confidence(source_field: str, target_field: str, source_type: str = None, target_type: str = None) -> float:
    """
    Calculate confidence score for matching source field to target field
    Returns a score between 0 and 1
    """
    # Direct exact match
    if source_field.lower() == target_field.lower():
        return 1.0
    
    # Normalized exact match
    if normalize_field_name(source_field) == normalize_field_name(target_field):
        return 0.95
    
    # Alias match
    alias_score = get_alias_match(source_field, target_field)
    if alias_score > 0:
        return alias_score
    
    # Fuzzy string similarity
    similarity = calculate_similarity(normalize_field_name(source_field), normalize_field_name(target_field))
    
    # Boost if types match
    if source_type and target_type:
        type_map = {
            'Int64': ['integer', 'int', 'number'],
            'Float64': ['float', 'decimal', 'number', 'double'],
            'Utf8': ['string', 'text', 'varchar'],
            'Date': ['date', 'datetime', 'timestamp'],
            'Boolean': ['bool', 'boolean'],
        }
        source_type_norm = source_type.lower()
        target_type_norm = target_type.lower()
        if source_type_norm == target_type_norm:
            similarity = min(1.0, similarity + 0.1)
        else:
            for base_type, variants in type_map.items():
                if (source_type_norm in variants or base_type.lower() in source_type_norm) and \
                   (target_type_norm in variants or base_type.lower() in target_type_norm):
                    similarity = min(1.0, similarity + 0.05)
                    break
    
    return similarity


def suggest_field_mappings(
    source_fields: Dict[str, str],  # {field_name: field_type}
    target_fields: Dict[str, str]   # {field_name: field_type}
) -> List[Dict]:
    """
    Suggest field mappings with confidence scores
    Returns list of {source, target, confidence, reason}
    """
    suggestions = []
    
    for source_name, source_type in source_fields.items():
        matches = []
        for target_name, target_type in target_fields.items():
            confidence = match_field_confidence(source_name, target_name, source_type, target_type)
            if confidence > 0.3:  # Minimum threshold
                matches.append({
                    'target': target_name,
                    'confidence': round(confidence, 2),
                    'reason': get_match_reason(source_name, target_name, confidence)
                })
        
        # Sort by confidence
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        
        suggestions.append({
            'source': source_name,
            'source_type': source_type,
            'matches': matches[:3]  # Top 3 matches
        })
    
    return suggestions


def get_match_reason(source: str, target: str, confidence: float) -> str:
    """Generate human-readable reason for match"""
    if confidence >= 0.95:
        return "Exact match"
    elif confidence >= 0.85:
        return "Known alias"
    elif confidence >= 0.7:
        return "High similarity"
    elif confidence >= 0.5:
        return "Moderate similarity"
    else:
        return "Low similarity"
