---
description: Perform deep architectural and code quality review for Python and TypeScript code
handoffs:
  - label: Fix Critical Issues
    agent: general-purpose
    prompt: Fix the critical and high-priority issues identified in the code review
    send: true
  - label: Refactor Code
    agent: general-purpose
    prompt: Refactor the code based on review recommendations
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

The text the user typed after `/codereview` is the path(s) to files or directories to review. Assume you always have it available in this conversation even if `$ARGUMENTS` appears literally below.

Given the file/directory paths, perform this comprehensive code review:

### 1. **Parse Target Files**

1. If user provides specific file paths, validate they exist
2. If user provides directory path, recursively find all Python (*.py) and TypeScript (*.ts, *.tsx) files
3. If no arguments provided, ask user to specify target files or directories
4. Exclude common paths: `node_modules/`, `venv/`, `__pycache__/`, `dist/`, `build/`, `.git/`

### 2. **Initial Code Analysis**

For each target file, perform:

1. **File Size Check**:
   - Files over 500 lines should be flagged for potential split
   - Report total lines of code per file

2. **Language Detection**:
   - Identify Python vs TypeScript
   - Check language version indicators (type hints in Python, TS version features)

3. **Import/Dependency Analysis**:
   - List all imports and dependencies
   - Identify unused imports
   - Check for circular dependencies
   - Flag deprecated library usage

### 3. **Architecture & Design Review**

Apply the following architecture principles:

#### A. SOLID Principles

1. **Single Responsibility Principle (SRP)**
   - Each class/module should have one reason to change
   - Check if classes are doing too many things
   - Flag classes with more than 3 distinct responsibilities

2. **Open/Closed Principle (OCP)**
   - Code should be open for extension, closed for modification
   - Check for proper use of inheritance/composition
   - Flag hardcoded values that prevent extension

3. **Liskov Substitution Principle (LSP)**
   - Derived classes must be substitutable for base classes
   - Check inheritance hierarchies
   - Flag violations where subclasses change expected behavior

4. **Interface Segregation Principle (ISP)**
   - Clients shouldn't depend on interfaces they don't use
   - Python: Check Protocol/ABC usage
   - TypeScript: Check interface definitions
   - Flag fat interfaces with too many methods

5. **Dependency Inversion Principle (DIP)**
   - Depend on abstractions, not concretions
   - Check for direct instantiation of concrete classes
   - Suggest dependency injection where appropriate

#### B. Language-Specific Architecture

**Python Architecture Checks**:
- Proper use of `@dataclass`, `@property`, `@classmethod`, `@staticmethod`
- Appropriate use of `typing` module (Protocol, TypeVar, Generic, etc.)
- Context managers for resource management
- Generator usage for memory efficiency
- Proper exception hierarchy
- Use of `__init__.py` for package structure
- Async/await patterns if using asyncio

**TypeScript Architecture Checks**:
- Proper interface/type usage vs classes
- Generic type parameters appropriately used
- Union/Intersection types for flexibility
- Proper use of `readonly`, `private`, `protected`
- Type guards and discriminated unions
- Proper module export/import patterns
- Decorator usage (if enabled)

#### C. Design Pattern Review

**Builder Pattern** (REQUIRED CHECK):
- Identify classes with 7+ constructor parameters → MUST suggest Builder
- Check existing Builder implementations for correctness:
  - Fluent interface (method chaining)
  - Immutability after build
  - Validation in build() method
  - Clear separation of concerns

**Other Common Patterns**:
- Factory/Abstract Factory (for object creation)
- Strategy Pattern (for algorithm variation)
- Observer Pattern (for event handling)
- Repository Pattern (for data access)
- Singleton (check for anti-pattern usage)

#### D. Interface Design

**Python Interface Design**:
- Check for proper use of `abc.ABC` or `typing.Protocol`
- Interface methods should be cohesive
- Document contracts with docstrings
- Use `NotImplementedError` appropriately

**TypeScript Interface Design**:
- Interfaces should be small and focused
- Prefer composition over complex inheritance
- Use discriminated unions for variants
- Proper optional vs required properties

#### E. Extensibility & Flexibility

- Configuration should be externalized
- Hard dependencies should be minimal
- Plugin/extension points should be clear
- Feature flags for gradual rollout
- Avoid tight coupling between modules

### 4. **Code Quality Review**

#### A. KISS Principle (Keep It Simple, Stupid)

- Flag overly complex logic
- Suggest simplification opportunities
- Check cyclomatic complexity (target: < 10 per function)
- Identify nested loops/conditions (max 3 levels)
- Flag clever code that sacrifices readability

#### B. DRY Principle (Don't Repeat Yourself)

- Detect code duplication (3+ similar lines)
- Identify repeated logic that should be extracted
- Check for copy-pasted code blocks
- Suggest helper functions/utilities

#### C. YAGNI Principle (You Aren't Gonna Need It)

- Flag unused code, functions, classes
- Identify over-engineered solutions
- Check for premature optimization
- Suggest removal of speculative features

#### D. Function Quality Metrics

**CRITICAL CHECKS**:

1. **Function Length**:
   - ❌ FAIL: Functions > 150 lines
   - ⚠️ WARNING: Functions > 100 lines
   - ✅ IDEAL: Functions < 50 lines

2. **Parameter Count**:
   - ❌ FAIL: Functions with > 7 parameters
   - ⚠️ WARNING: Functions with > 5 parameters
   - ✅ IDEAL: Functions with < 4 parameters
   - For 5+ parameters, suggest:
     - Parameter object/dataclass
     - Builder pattern
     - Configuration object

3. **Cognitive Complexity**:
   - Nested conditions
   - Multiple return paths
   - Exception handling complexity

#### E. Naming Conventions

**Python**:
- `snake_case` for functions, variables, modules
- `PascalCase` for classes
- `UPPER_CASE` for constants
- Private: `_leading_underscore`
- Dunder methods: `__special__`

**TypeScript**:
- `camelCase` for functions, variables
- `PascalCase` for classes, interfaces, types
- `UPPER_CASE` for constants
- Private: `#private` or `private` keyword
- Avoid `I` prefix for interfaces

#### F. Type Safety

**Python**:
- All function signatures should have type hints
- Return types must be specified
- Use `typing` module comprehensively
- Avoid `Any` type except when necessary
- Use `TypedDict` for structured dictionaries

**TypeScript**:
- Avoid `any` type (use `unknown` if needed)
- Prefer `interface` over `type` for objects
- Use strict null checks
- Leverage union types appropriately
- Generic constraints should be specific

### 5. **Best Practices Review**

#### A. Error Handling

**Python**:
- Specific exception types (not bare `except:`)
- Custom exception classes inherit from appropriate base
- Exception messages are descriptive
- Resource cleanup with context managers
- Proper error propagation

**TypeScript**:
- Proper error types (extend `Error`)
- Try-catch blocks at appropriate boundaries
- Promise rejection handling
- Async error propagation
- Type-safe error handling

#### B. Testing Considerations

- Functions should be testable (pure when possible)
- Dependencies should be injectable
- Side effects should be isolated
- Mock/stub points should be clear

#### C. Documentation

- Docstrings/JSDoc for public APIs
- Complex logic should have inline comments
- Type hints serve as documentation
- README for modules/packages

#### D. Performance & Optimization

- Appropriate data structures
- Algorithm complexity awareness
- Avoid premature optimization
- Memory leak potential
- Database query efficiency

#### E. Security

- Input validation and sanitization
- SQL injection prevention
- XSS prevention (TypeScript/web)
- Secret management (no hardcoded secrets)
- Authentication/authorization patterns
- Dependency vulnerabilities

### 6. **Review Report Generation**

Generate a comprehensive report with the following structure:

```markdown
# Code Review Report
**Generated**: [DATE]
**Reviewed Files**: [COUNT] files ([PYTHON_COUNT] Python, [TS_COUNT] TypeScript)
**Total Lines**: [TOTAL_LOC]

---

## Executive Summary

### Overall Score: [SCORE]/100

- Architecture & Design: [SCORE]/25
- Code Quality: [SCORE]/25
- Best Practices: [SCORE]/25
- Maintainability: [SCORE]/25

### Critical Issues: [COUNT]
### High Priority: [COUNT]
### Medium Priority: [COUNT]
### Low Priority: [COUNT]

---

## 1. Architecture & Design Issues

### 1.1 SOLID Violations

[List violations with file:line references]

### 1.2 Design Pattern Opportunities

[List recommended patterns]

**Builder Pattern Required** (7+ parameters):
- [ ] `ClassName.method()` in file.py:123 (9 parameters)

### 1.3 Interface Design Issues

[List interface problems]

### 1.4 Extensibility Concerns

[List tight coupling, hard dependencies]

---

## 2. Code Quality Issues

### 2.1 KISS Violations

[Complex code that needs simplification]

### 2.2 DRY Violations

[Duplicated code sections]

### 2.3 YAGNI Issues

[Unused or over-engineered code]

### 2.4 Function Quality Metrics

**Functions Exceeding Limits**:

❌ **CRITICAL - Over 150 lines**:
- `function_name()` in file.py:100 (187 lines)

❌ **CRITICAL - Over 7 parameters**:
- `function_name()` in file.ts:50 (9 parameters)
  - **Recommendation**: Use Builder pattern or parameter object

⚠️ **WARNING - 100-150 lines**:
- `another_function()` in file.py:300 (125 lines)

⚠️ **WARNING - 5-7 parameters**:
- `setup_function()` in file.ts:200 (6 parameters)

### 2.5 Naming Issues

[Inconsistent or unclear names]

### 2.6 Type Safety Issues

[Missing type hints, use of any/Any]

---

## 3. Best Practices Issues

### 3.1 Error Handling

[Improper exception handling]

### 3.2 Testing Concerns

[Code that's hard to test]

### 3.3 Documentation

[Missing or inadequate documentation]

### 3.4 Performance

[Inefficient code patterns]

### 3.5 Security

[Security vulnerabilities]

---

## 4. Detailed File Analysis

### [File 1]: path/to/file.py

**Lines of Code**: 234
**Issues Found**: 7 (2 critical, 3 high, 2 medium)

#### Issues:

**CRITICAL**: Function `process_data` exceeds 150 lines (file.py:45-223)
- **Impact**: Hard to understand, test, and maintain
- **Recommendation**: Extract into smaller functions:
  - `validate_input()` - lines 50-80
  - `transform_data()` - lines 85-150
  - `save_results()` - lines 155-210

**HIGH**: Class `DataProcessor` has 8 parameters (file.py:10)
- **Impact**: Difficult to instantiate, error-prone
- **Recommendation**: Implement Builder pattern:
  ```python
  class DataProcessorBuilder:
      def __init__(self):
          # Initialize with defaults

      def with_source(self, source):
          self._source = source
          return self

      def with_timeout(self, timeout):
          self._timeout = timeout
          return self

      def build(self) -> DataProcessor:
          # Validate and construct
          return DataProcessor(...)
  ```

[Continue for each issue...]

---

## 5. Recommendations by Priority

### Immediate Action (Critical)

1. Refactor functions exceeding 150 lines
2. Implement Builder pattern for classes with 7+ parameters
3. Fix security vulnerabilities
4. Add type hints to public APIs

### High Priority

1. Extract duplicated code
2. Simplify complex functions
3. Fix SOLID violations
4. Improve error handling

### Medium Priority

1. Add missing documentation
2. Improve naming consistency
3. Remove unused code
4. Optimize performance bottlenecks

### Low Priority (Nice to Have)

1. Additional type safety
2. Minor refactoring opportunities
3. Code style consistency
4. Additional test coverage points

---

## 6. Positive Highlights

[List examples of good code, patterns, practices]

---

## 7. Next Steps

1. Review critical issues with team
2. Create refactoring tasks
3. Set up linting/static analysis
4. Establish coding standards
5. Plan incremental improvements

---

## Appendix A: Metrics Summary

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Avg Function Length | 45 lines | < 50 | ✅ PASS |
| Max Function Length | 187 lines | < 150 | ❌ FAIL |
| Functions > 150 lines | 3 | 0 | ❌ FAIL |
| Functions with 7+ params | 2 | 0 | ❌ FAIL |
| Type Coverage | 85% | > 90% | ⚠️ WARNING |
| Cyclomatic Complexity (avg) | 6 | < 10 | ✅ PASS |

---

## Appendix B: Tools Recommendations

**Python**:
- Linting: `ruff`, `pylint`, `flake8`
- Type Checking: `mypy`, `pyright`
- Formatting: `black`, `isort`
- Complexity: `radon`, `mccabe`

**TypeScript**:
- Linting: `eslint` with appropriate configs
- Type Checking: `tsc --noEmit`
- Formatting: `prettier`
- Complexity: `eslint-plugin-complexity`

**Both**:
- Pre-commit hooks: `husky`, `pre-commit`
- CI/CD integration
- Code coverage: `pytest-cov`, `jest`
```

### 7. **Interactive Review Mode**

After generating the report:

1. Present summary statistics
2. Ask user which category to dive deeper into
3. Provide actionable fix suggestions
4. Offer to create refactoring tasks
5. Generate example code for recommended patterns

### 8. **Quality Gates**

Define pass/fail criteria:

**Blocking Issues (Must Fix)**:
- Functions > 150 lines
- Functions with > 7 parameters
- Security vulnerabilities
- Missing type hints on public APIs

**Warning Issues (Should Fix)**:
- Functions > 100 lines
- Functions with > 5 parameters
- Code duplication
- Complex functions (complexity > 10)

**Info Issues (Consider Fixing)**:
- Naming inconsistencies
- Missing documentation
- Minor optimization opportunities

---

## General Guidelines

### Review Philosophy

1. **Pragmatic over Dogmatic**: Rules are guidelines; context matters
2. **Maintainability First**: Code is read 10x more than written
3. **Incremental Improvement**: Don't demand perfection, suggest evolution
4. **Teach, Don't Just Critique**: Explain the "why" behind suggestions

### False Positive Handling

- Performance-critical code may violate length limits
- Framework-required patterns may appear complex
- Generated code may not follow conventions
- Flag these but acknowledge legitimate exceptions

### Language-Specific Considerations

**Python**:
- Duck typing is acceptable when type hints are present
- List comprehensions are pythonic (but not nested ones)
- Magic methods are part of the language
- `__init__.py` may be empty (namespace packages)

**TypeScript**:
- `any` is sometimes necessary for gradual typing
- Type assertions have legitimate uses
- `as const` is a powerful pattern
- Declaration merging is intentional

### Review Sensitivity

- Be constructive, not destructive
- Acknowledge good practices found
- Suggest, don't demand (except for critical issues)
- Consider team experience level
- Account for project constraints (deadlines, resources)

### Builder Pattern Enforcement

When 7+ parameters detected:

1. Calculate refactoring effort
2. Provide complete Builder implementation example
3. Show before/after usage comparison
4. Explain benefits: readability, immutability, validation
5. Flag as **CRITICAL** if constructor is used in multiple places

### Output Format

- Use clear severity indicators: ❌ CRITICAL, ⚠️ WARNING, ℹ️ INFO, ✅ PASS
- Include file:line references for all issues
- Provide code snippets showing problems
- Include suggested fixes with code examples
- Link to relevant documentation/standards

### Exclusions

Do not flag these as issues:
- Test files with long test functions (acceptable)
- Configuration files with many parameters
- Auto-generated code (mention it but don't score)
- Intentional design patterns (mark as "verified")
