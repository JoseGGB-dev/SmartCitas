package com.smartcitas.priority;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PriorityCalculationServiceTest {

  private final PriorityCalculationService service = new PriorityCalculationService(null, null);

  @Test
  void patientUnder50GetsOnlyWaitingPoints() {
    assertThat(service.calculateScoreForTest(49, false, 20)).isEqualByComparingTo(BigDecimal.valueOf(10).setScale(2));
  }

  @Test
  void patientBetween50And64GetsTenAgePoints() {
    assertThat(service.calculateScoreForTest(50, false, 0)).isEqualByComparingTo(BigDecimal.valueOf(10).setScale(2));
    assertThat(service.calculateScoreForTest(64, false, 0)).isEqualByComparingTo(BigDecimal.valueOf(10).setScale(2));
  }

  @Test
  void patient65OrOlderGetsThirtyAgePoints() {
    assertThat(service.calculateScoreForTest(65, false, 0)).isEqualByComparingTo(BigDecimal.valueOf(30).setScale(2));
    assertThat(service.calculateScoreForTest(80, false, 0)).isEqualByComparingTo(BigDecimal.valueOf(30).setScale(2));
  }

  @Test
  void chronicConditionAddsFortyPoints() {
    assertThat(service.calculateScoreForTest(40, true, 0)).isEqualByComparingTo(BigDecimal.valueOf(40).setScale(2));
  }

  @Test
  void nonChronicConditionDoesNotAddPoints() {
    assertThat(service.calculateScoreForTest(40, false, 0)).isEqualByComparingTo(BigDecimal.ZERO.setScale(2));
  }

  @Test
  void waitingDaysAddHalfPointPerDay() {
    assertThat(service.calculateScoreForTest(40, false, 120)).isEqualByComparingTo(BigDecimal.valueOf(60).setScale(2));
  }

  @Test
  void missingAgeDoesNotBreakTheCalculation() {
    assertThat(service.calculateScoreForTest(null, false, 4)).isEqualByComparingTo(BigDecimal.valueOf(2).setScale(2));
  }

  @Test
  void invalidNegativeWaitingDaysAreClampedToZero() {
    assertThat(service.calculateScoreForTest(65, true, -10)).isEqualByComparingTo(BigDecimal.valueOf(70).setScale(2));
  }
}
