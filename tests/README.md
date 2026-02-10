# Monix Test Suite

This directory contains comprehensive test cases for the Monix engine and API.

## Test Structure

```
tests/
├── __init__.py
├── test_collectors_system.py    # System stats collection tests
├── test_analyzers_threat.py     # Threat detection tests
├── test_analyzers_traffic.py    # Traffic analysis and log parsing tests
├── test_scanners_web.py         # Web security scanning tests
└── test_api_server.py           # API endpoint tests
```

## Running Tests

### Run All Tests
```bash
pytest tests/
```

### Run Specific Test File
```bash
pytest tests/test_collectors_system.py -v
```

### Run Specific Test Class
```bash
pytest tests/test_analyzers_threat.py::TestDetectThreats -v
```

### Run Specific Test Method
```bash
pytest tests/test_api_server.py::TestHealthEndpoint::test_health_endpoint -v
```

### Run with Coverage
```bash
pytest tests/ --cov=engine --cov=api --cov-report=html
```

## Test Coverage

The test suite covers the following core functionality:

### Engine Collectors (17 tests)
- ✅ System statistics collection (CPU, memory, disk, network)
- ✅ Process monitoring
- ✅ Utility functions (format_uptime, format_bytes)
- ✅ Error handling

### Engine Analyzers (44 tests)
- ✅ Threat detection (SYN floods, port scans, high connection counts)
- ✅ Connection analysis
- ✅ Traffic log parsing (Nginx format)
- ✅ Suspicious URL detection
- ✅ Malicious bot detection
- ✅ Threat level classification

### Engine Scanners (23 tests)
- ✅ SSL/TLS certificate validation
- ✅ DNS record analysis
- ✅ HTTP security headers checking
- ✅ Security.txt detection
- ✅ Technology detection
- ✅ Port scanning
- ✅ Cookie analysis
- ✅ Redirect tracking

### API Server (19 tests)
- ✅ Health check endpoint
- ✅ URL analysis endpoint
- ✅ IP analysis endpoint
- ✅ Connection monitoring endpoint
- ✅ System stats endpoint
- ✅ Alerts endpoint
- ✅ Processes endpoint
- ✅ Dashboard endpoint
- ✅ Error handling

## Test Statistics

- **Total Tests**: 103
- **Pass Rate**: 100%
- **Modules Covered**: 5

## Test Features

### Mocking
Tests use `pytest-mock` and `unittest.mock` to mock external dependencies:
- System calls (psutil)
- Network requests (requests, socket)
- DNS resolution
- File I/O

### Parametrization
Tests cover multiple scenarios:
- Normal operation
- Edge cases
- Error conditions
- Boundary values

### Fixtures
- Flask test client for API testing
- Mock data for realistic test scenarios

## Dependencies

Tests require the following packages:
```bash
pip install pytest pytest-mock flask
```

All production dependencies should also be installed:
```bash
pip install -r requirements.txt
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines. They:
- Execute quickly (< 1 second total)
- Don't require external services
- Use mocking for all external dependencies
- Provide clear error messages

## Test Best Practices

1. **Isolation**: Each test is independent and can run in any order
2. **Fast**: All tests complete in under 1 second
3. **Readable**: Test names clearly describe what is being tested
4. **Comprehensive**: Cover success, failure, and edge cases
5. **Maintainable**: Use fixtures and helper functions to reduce duplication

## Adding New Tests

When adding new functionality:

1. Create tests first (TDD approach recommended)
2. Follow existing test structure and naming conventions
3. Use appropriate test class grouping
4. Mock external dependencies
5. Test both success and error paths
6. Update this README with new coverage

## Common Issues

### Import Errors
If you see import errors, ensure you're running pytest from the project root:
```bash
cd /path/to/monix
pytest tests/
```

### Missing Dependencies
Install all dependencies:
```bash
pip install -r requirements.txt
pip install pytest pytest-mock flask
```

## Contributing

When contributing tests:
- Ensure all existing tests still pass
- Maintain 100% pass rate
- Follow PEP 8 style guidelines
- Add docstrings to test methods
- Group related tests in classes
