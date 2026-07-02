#!/bin/bash

# Security Hardening Verification Tests
# Run this script on the production server after deployment

echo "🔒 SECURITY HARDENING VERIFICATION TESTS"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="http://localhost:5000"
ADMIN_HOST="admin.forgedominance.com"
MAIN_HOST="forgedominance.com"

# Get a valid token (this requires an admin account)
# For testing, you can use a pre-generated token or skip token-based tests
TEST_TOKEN="${TEST_TOKEN:-}"

test_count=0
passed_count=0
failed_count=0

run_test() {
  local name=$1
  local method=$2
  local url=$3
  local host=$4
  local headers=$5
  local expected_status=$6
  
  test_count=$((test_count + 1))
  
  echo -n "Test $test_count: $name... "
  
  # Build curl command with Host header
  cmd="curl -s -X $method '$BASE_URL$url' -H 'Host: $host' -w '\n%{http_code}'"
  
  if [ -n "$headers" ]; then
    cmd="$cmd -H '$headers'"
  fi
  
  # Execute and capture response + status code
  response=$(eval "$cmd")
  status=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [[ "$status" == "$expected_status"* ]]; then
    echo -e "${GREEN}PASS${NC} (HTTP $status)"
    passed_count=$((passed_count + 1))
  else
    echo -e "${RED}FAIL${NC} (Expected $expected_status, got $status)"
    echo "  Response: $body"
    failed_count=$((failed_count + 1))
  fi
}

echo "TEST GROUP 1: Admin Subdomain Enforcement"
echo "-----------------------------------------"

# Test 1: Admin endpoint with wrong host (no token) - should be 403
run_test "Admin endpoint from wrong host (no auth)" \
  GET "/api/dashboard/kpis" "$MAIN_HOST" "" "403"

# Test 2: Admin endpoint with correct host (no token) - should be 401 (auth required, not 403)
run_test "Admin endpoint from correct host (no auth)" \
  GET "/api/dashboard/kpis" "$ADMIN_HOST" "" "401"

if [ -n "$TEST_TOKEN" ]; then
  # Test 3: Admin endpoint with correct host and token - should be 200
  run_test "Admin endpoint from correct host (with auth)" \
    GET "/api/dashboard/kpis" "$ADMIN_HOST" "Authorization: Bearer $TEST_TOKEN" "200"
  
  # Test 4: Admin endpoint with wrong host and token - should be 403 (host check happens first)
  run_test "Admin endpoint from wrong host (with auth)" \
    GET "/api/dashboard/kpis" "$MAIN_HOST" "Authorization: Bearer $TEST_TOKEN" "403"
else
  echo -e "${YELLOW}⚠ Skipping token-based tests (set TEST_TOKEN env var to enable)${NC}"
fi

echo ""
echo "TEST GROUP 2: Public Routes Still Work"
echo "-------------------------------------"

# Test 5: Public API endpoint - should work from any host
run_test "Public API from main host" \
  GET "/api/products" "$MAIN_HOST" "" "200"

# Test 6: Public API endpoint with admin host - should work
run_test "Public API from admin host" \
  GET "/api/products" "$ADMIN_HOST" "" "200"

echo ""
echo "TEST GROUP 3: Static File Access"
echo "-------------------------------"

# Test 7: Admin static files from wrong host - should be 403
run_test "Admin login.html from main host" \
  GET "/admin/login.html" "$MAIN_HOST" "" "403"

# Test 8: Admin static files from correct host - should be 200
run_test "Admin login.html from admin host" \
  GET "/admin/login.html" "$ADMIN_HOST" "" "200"

echo ""
echo "TEST GROUP 4: Security Headers Verification"
echo "-----------------------------------------"

echo -n "Test $((test_count + 1)): Security headers present... "
test_count=$((test_count + 1))

headers=$(curl -s -I -X GET "$BASE_URL/api/products" -H "Host: $MAIN_HOST")

# Check for key security headers
has_hsts=$(echo "$headers" | grep -i "strict-transport-security" || echo "")
has_content_type=$(echo "$headers" | grep -i "x-content-type-options" || echo "")
has_frame_options=$(echo "$headers" | grep -i "x-frame-options" || echo "")
has_csp=$(echo "$headers" | grep -i "content-security-policy" || echo "")

if [ -n "$has_content_type" ] && [ -n "$has_frame_options" ] && [ -n "$has_csp" ]; then
  echo -e "${GREEN}PASS${NC}"
  echo "  ✓ X-Content-Type-Options present"
  echo "  ✓ X-Frame-Options present"
  echo "  ✓ Content-Security-Policy present"
  [ -n "$has_hsts" ] && echo "  ✓ HSTS present (production)" || echo "  ℹ HSTS not present (expected in dev)"
  passed_count=$((passed_count + 1))
else
  echo -e "${RED}FAIL${NC}"
  [ -z "$has_content_type" ] && echo "  ✗ Missing X-Content-Type-Options"
  [ -z "$has_frame_options" ] && echo "  ✗ Missing X-Frame-Options"
  [ -z "$has_csp" ] && echo "  ✗ Missing Content-Security-Policy"
  failed_count=$((failed_count + 1))
fi

echo ""
echo "TEST GROUP 5: CORS Behavior"
echo "------------------------"

# Test 9: CORS with public domain origin - should allow
run_test "CORS allow public domain" \
  OPTIONS "/api/products" "$MAIN_HOST" "Origin: https://forgedominance.com" "200"

# Test 10: CORS with admin domain origin - should allow
run_test "CORS allow admin domain" \
  OPTIONS "/api/dashboard/kpis" "$ADMIN_HOST" "Origin: https://admin.forgedominance.com" "200"

echo ""
echo "=========================================="
echo "TEST RESULTS SUMMARY"
echo "=========================================="
echo -e "Total Tests: $test_count"
echo -e "Passed: ${GREEN}$passed_count${NC}"
echo -e "Failed: ${RED}$failed_count${NC}"

if [ $failed_count -eq 0 ]; then
  echo -e ""
  echo -e "${GREEN}✅ ALL TESTS PASSED - Security hardening is working correctly!${NC}"
  exit 0
else
  echo -e ""
  echo -e "${RED}❌ SOME TESTS FAILED - Review the errors above${NC}"
  exit 1
fi
