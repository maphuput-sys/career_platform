const calculateMatchScore = (student, transcripts, job) => {
  let totalScore = 0;
  let criteriaCount = 0;

  // 1. Academic Performance (40%)
  const academicScore = calculateAcademicMatch(transcripts, job.requirements);
  if (academicScore !== null) {
    totalScore += academicScore * 0.4;
    criteriaCount += 0.4;
  }

  // 2. Qualifications (25%)
  const qualificationScore = calculateQualificationMatch(student.profile, job.qualifications);
  if (qualificationScore !== null) {
    totalScore += qualificationScore * 0.25;
    criteriaCount += 0.25;
  }

  // 3. Skills (20%)
  const skillScore = calculateSkillMatch(student.profile, job.requirements);
  if (skillScore !== null) {
    totalScore += skillScore * 0.2;
    criteriaCount += 0.2;
  }

  // 4. Experience (15%)
  const experienceScore = calculateExperienceMatch(student.profile, job.requirements);
  if (experienceScore !== null) {
    totalScore += experienceScore * 0.15;
    criteriaCount += 0.15;
  }

  // Normalize score based on available criteria
  return criteriaCount > 0 ? totalScore / criteriaCount : 0;
};

const calculateAcademicMatch = (transcripts, requirements) => {
  if (!requirements || !requirements.minGPA) return 0.5; // Default average score

  let highestGPA = 0;
  transcripts.forEach(transcript => {
    if (transcript.grades && transcript.grades.gpa) {
      highestGPA = Math.max(highestGPA, transcript.grades.gpa);
    }
  });

  const requiredGPA = parseFloat(requirements.minGPA);
  
  if (highestGPA >= requiredGPA) {
    // Scale from required GPA to 4.0 (perfect match)
    return 0.5 + (0.5 * ((highestGPA - requiredGPA) / (4.0 - requiredGPA)));
  } else {
    // Below required GPA
    return 0.2 * (highestGPA / requiredGPA);
  }
};

const calculateQualificationMatch = (profile, qualifications) => {
  if (!qualifications || qualifications.length === 0) return 0.5;

  const studentCerts = profile.certificates || [];
  let matchCount = 0;

  qualifications.forEach(qualification => {
    if (studentCerts.some(cert => 
      cert.name.toLowerCase().includes(qualification.toLowerCase()) ||
      qualification.toLowerCase().includes(cert.name.toLowerCase())
    )) {
      matchCount++;
    }
  });

  return matchCount / qualifications.length;
};

const calculateSkillMatch = (profile, requirements) => {
  if (!requirements || !requirements.skills) return 0.5;

  const studentSkills = profile.skills || [];
  const requiredSkills = requirements.skills;
  
  let matchCount = 0;

  requiredSkills.forEach(skill => {
    if (studentSkills.some(studentSkill =>
      studentSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(studentSkill.toLowerCase())
    )) {
      matchCount++;
    }
  });

  return matchCount / requiredSkills.length;
};

const calculateExperienceMatch = (profile, requirements) => {
  if (!requirements || !requirements.experience) return 0.5;

  const studentExperience = profile.experience || [];
  const requiredExperience = requirements.experience || 0;

  const totalMonths = studentExperience.reduce((total, exp) => {
    return total + (exp.duration || 0);
  }, 0);

  if (totalMonths >= requiredExperience) {
    return 1.0; // Meets or exceeds requirement
  } else {
    return totalMonths / requiredExperience; // Partial match
  }
};

module.exports = {
  calculateMatchScore,
  calculateAcademicMatch,
  calculateQualificationMatch,
  calculateSkillMatch,
  calculateExperienceMatch
};