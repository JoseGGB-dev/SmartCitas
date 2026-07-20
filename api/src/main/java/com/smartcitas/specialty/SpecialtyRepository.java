package com.smartcitas.specialty;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpecialtyRepository extends JpaRepository<Specialty, Long> {
  List<Specialty> findByActiveTrueOrderByName();
}
