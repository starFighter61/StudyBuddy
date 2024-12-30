{
  description = "Python environment for StudyBuddy";
  deps = [
    pkgs.python39
    pkgs.python39Packages.pip
    pkgs.nodejs-16_x
    pkgs.yarn
  ];
}
