package utils

import "testing"

// TestAddPositiveNumbers 测试两个正数相加
func TestAddPositiveNumbers(t *testing.T) {
	result := add(3, 5)
	expected := 8
	if result != expected {
		t.Errorf("add(3, 5) = %d; expected %d", result, expected)
	}
}

// TestAddNegativeNumbers 测试两个负数相加
func TestAddNegativeNumbers(t *testing.T) {
	result := add(-3, -5)
	expected := -8
	if result != expected {
		t.Errorf("add(-3, -5) = %d; expected %d", result, expected)
	}
}

// TestAddPositiveNegative 测试正数和负数相加（正数在前）
func TestAddPositiveNegative(t *testing.T) {
	result := add(10, -4)
	expected := 6
	if result != expected {
		t.Errorf("add(10, -4) = %d; expected %d", result, expected)
	}
}

// TestAddNegativePositive 测试负数和正数相加（负数在前）
func TestAddNegativePositive(t *testing.T) {
	result := add(-10, 4)
	expected := -6
	if result != expected {
		t.Errorf("add(-10, 4) = %d; expected %d", result, expected)
	}
}

// TestAddZeros 测试零加零
func TestAddZeros(t *testing.T) {
	result := add(0, 0)
	expected := 0
	if result != expected {
		t.Errorf("add(0, 0) = %d; expected %d", result, expected)
	}
}

// TestAddZeroPositive 测试零加正数
func TestAddZeroPositive(t *testing.T) {
	result := add(0, 7)
	expected := 7
	if result != expected {
		t.Errorf("add(0, 7) = %d; expected %d", result, expected)
	}
}

// TestAddPositiveZero 测试正数加零
func TestAddPositiveZero(t *testing.T) {
	result := add(7, 0)
	expected := 7
	if result != expected {
		t.Errorf("add(7, 0) = %d; expected %d", result, expected)
	}
}

// TestAddZeroNegative 测试零加负数
func TestAddZeroNegative(t *testing.T) {
	result := add(0, -5)
	expected := -5
	if result != expected {
		t.Errorf("add(0, -5) = %d; expected %d", result, expected)
	}
}

// TestAddNegativeZero 测试负数加零
func TestAddNegativeZero(t *testing.T) {
	result := add(-5, 0)
	expected := -5
	if result != expected {
		t.Errorf("add(-5, 0) = %d; expected %d", result, expected)
	}
}

// TestAddLargeNumbers 测试大数相加
func TestAddLargeNumbers(t *testing.T) {
	result := add(1000000, 2000000)
	expected := 3000000
	if result != expected {
		t.Errorf("add(1000000, 2000000) = %d; expected %d", result, expected)
	}
}

// TestAddLargeNegativeNumbers 测试大负数相加
func TestAddLargeNegativeNumbers(t *testing.T) {
	result := add(-1000000, -2000000)
	expected := -3000000
	if result != expected {
		t.Errorf("add(-1000000, -2000000) = %d; expected %d", result, expected)
	}
}

// TestAddEqualNumbers 测试相等的数相加
func TestAddEqualNumbers(t *testing.T) {
	result := add(42, 42)
	expected := 84
	if result != expected {
		t.Errorf("add(42, 42) = %d; expected %d", result, expected)
	}
}

// TestAddSameNumberPositiveNegative 测试同一个数正负相加（结果为零）
func TestAddSameNumberPositiveNegative(t *testing.T) {
	result := add(100, -100)
	expected := 0
	if result != expected {
		t.Errorf("add(100, -100) = %d; expected %d", result, expected)
	}
}

// TestAddOnes 测试1加1
func TestAddOnes(t *testing.T) {
	result := add(1, 1)
	expected := 2
	if result != expected {
		t.Errorf("add(1, 1) = %d; expected %d", result, expected)
	}
}

// TestAddMinusOnes 测试-1加-1
func TestAddMinusOnes(t *testing.T) {
	result := add(-1, -1)
	expected := -2
	if result != expected {
		t.Errorf("add(-1, -1) = %d; expected %d", result, expected)
	}
}

// TestAddOverflowNearMaxInt 测试接近int最大值的情况（测试溢出行为）
func TestAddOverflowNearMaxInt(t *testing.T) {
	// 注意：Go的int在64位系统上是int64，会自然溢出
	result := add(2147483647, 1)
	// 在64位系统上，这不会溢出，只是普通的加法
	expected := 2147483648
	if result != expected {
		t.Errorf("add(2147483647, 1) = %d; expected %d", result, expected)
	}
}

// TestAddOverflowNearMinInt 测试接近int最小值的情况
func TestAddOverflowNearMinInt(t *testing.T) {
	result := add(-2147483648, -1)
	expected := -2147483649
	if result != expected {
		t.Errorf("add(-2147483648, -1) = %d; expected %d", result, expected)
	}
}
