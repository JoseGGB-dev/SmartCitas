package com.smartcitas.appointment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "priority_evaluations")
public class PriorityEvaluation {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "waiting_list_entry_id", nullable = false)
  private WaitingListEntry waitingListEntry;

  @Column(name = "rules_version", nullable = false)
  private String rulesVersion;

  @Column(name = "age_points", nullable = false)
  private BigDecimal agePoints;

  @Column(name = "chronic_condition_points", nullable = false)
  private BigDecimal chronicConditionPoints;

  @Column(name = "waiting_days_points", nullable = false)
  private BigDecimal waitingDaysPoints;

  @Column(name = "additional_points", nullable = false)
  private BigDecimal additionalPoints;

  @Column(name = "total_score", nullable = false)
  private BigDecimal totalScore;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private List<String> explanation;

  @Column(name = "evaluated_at", nullable = false)
  private OffsetDateTime evaluatedAt;
}
