package com.smartcitas.controller;

import com.smartcitas.common.dto.ApiDtos.UpdateMeRequest;
import com.smartcitas.common.dto.ApiDtos.UserProfileResponse;
import com.smartcitas.common.dto.ApiMapper;
import com.smartcitas.user.ProfileService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {

  private final ProfileService profiles;
  private final ApiMapper mapper;

  public MeController(ProfileService profiles, ApiMapper mapper) {
    this.profiles = profiles;
    this.mapper = mapper;
  }

  @GetMapping
  UserProfileResponse me() {
    return mapper.userProfile(profiles.current());
  }

  @PatchMapping
  UserProfileResponse update(@Valid @RequestBody UpdateMeRequest request) {
    return mapper.userProfile(profiles.updateCurrent(request));
  }
}
