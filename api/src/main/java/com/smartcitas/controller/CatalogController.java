package com.smartcitas.controller;

import com.smartcitas.common.dto.ApiDtos.CatalogResponse;
import com.smartcitas.common.dto.ApiMapper;
import com.smartcitas.facility.FacilityRepository;
import com.smartcitas.specialty.SpecialtyRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {

  private final SpecialtyRepository specialties;
  private final FacilityRepository facilities;
  private final ApiMapper mapper;

  public CatalogController(SpecialtyRepository specialties, FacilityRepository facilities, ApiMapper mapper) {
    this.specialties = specialties;
    this.facilities = facilities;
    this.mapper = mapper;
  }

  @GetMapping("/specialties")
  List<CatalogResponse> specialties() {
    return specialties.findByActiveTrueOrderByName().stream().map(mapper::specialty).toList();
  }

  @GetMapping("/facilities")
  List<CatalogResponse> facilities() {
    return facilities.findByActiveTrueOrderByName().stream().map(mapper::facility).toList();
  }
}
