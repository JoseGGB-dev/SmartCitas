package com.smartcitas.priority;

import com.smartcitas.appointment.PriorityEvaluation;
import com.smartcitas.appointment.PriorityEvaluationRepository;
import com.smartcitas.appointment.WaitingListEntry;
import com.smartcitas.audit.AuditService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PriorityCalculationService {

  public static final String RULES_VERSION = "RULES_V1";

  private final PriorityEvaluationRepository evaluations;
  private final AuditService audit;

  public PriorityCalculationService(PriorityEvaluationRepository evaluations, AuditService audit) {
    this.evaluations = evaluations;
    this.audit = audit;
  }

  public PriorityEvaluation calculateAndStore(WaitingListEntry entry) {
    LocalDate birthDate = entry.getPatient().getBirthDate();
    int age = birthDate == null ? 0 : (int) ChronoUnit.YEARS.between(birthDate, LocalDate.now());
    long waitingDays = Math.max(0, ChronoUnit.DAYS.between(entry.getWaitingSince(), OffsetDateTime.now()));
    boolean chronic = entry.getPatient().isChronicCondition();

    BigDecimal agePoints = agePoints(age);
    BigDecimal chronicPoints = chronic ? BigDecimal.valueOf(40) : BigDecimal.ZERO;
    BigDecimal waitPoints = BigDecimal.valueOf(waitingDays).multiply(BigDecimal.valueOf(0.5)).setScale(2, RoundingMode.HALF_UP);
    BigDecimal additionalPoints = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    BigDecimal total = agePoints.add(chronicPoints).add(waitPoints).add(additionalPoints);

    PriorityEvaluation evaluation = new PriorityEvaluation();
    evaluation.setWaitingListEntry(entry);
    evaluation.setRulesVersion(RULES_VERSION);
    evaluation.setAgePoints(agePoints);
    evaluation.setChronicConditionPoints(chronicPoints);
    evaluation.setWaitingDaysPoints(waitPoints);
    evaluation.setAdditionalPoints(additionalPoints);
    evaluation.setTotalScore(total);
    evaluation.setExplanation(explanation(age, chronic, waitingDays, agePoints, chronicPoints, waitPoints));
    evaluation.setEvaluatedAt(OffsetDateTime.now());
    evaluations.save(evaluation);
    audit.record(null, "PRIORITY_EVALUATED", "waiting_list_entries", entry.getId().toString(), null, "{\"rulesVersion\":\"RULES_V1\"}");
    return evaluation;
  }

  public BigDecimal calculateScoreForTest(Integer age, boolean chronic, long waitingDays) {
    BigDecimal agePoints = age == null ? BigDecimal.ZERO : agePoints(age);
    BigDecimal chronicPoints = chronic ? BigDecimal.valueOf(40) : BigDecimal.ZERO;
    BigDecimal waitPoints = BigDecimal.valueOf(Math.max(0, waitingDays)).multiply(BigDecimal.valueOf(0.5));
    return agePoints.add(chronicPoints).add(waitPoints).setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal agePoints(int age) {
    if (age >= 65) {
      return BigDecimal.valueOf(30);
    }
    if (age >= 50) {
      return BigDecimal.valueOf(10);
    }
    return BigDecimal.ZERO;
  }

  private List<String> explanation(
      int age,
      boolean chronic,
      long waitingDays,
      BigDecimal agePoints,
      BigDecimal chronicPoints,
      BigDecimal waitPoints) {
    List<String> details = new ArrayList<>();
    if (age >= 65) {
      details.add("Edad igual o mayor a 65 anos: +" + agePoints.stripTrailingZeros().toPlainString());
    } else if (age >= 50) {
      details.add("Edad entre 50 y 64 anos: +" + agePoints.stripTrailingZeros().toPlainString());
    } else {
      details.add("Edad menor de 50 anos: +0");
    }
    details.add(chronic ? "Condicion cronica registrada: +" + chronicPoints.stripTrailingZeros().toPlainString() : "Sin condicion cronica registrada: +0");
    details.add(waitingDays + " dias de espera: +" + waitPoints.stripTrailingZeros().toPlainString());
    return details;
  }

}
