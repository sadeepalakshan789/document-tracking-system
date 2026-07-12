const CampusPosition = require("../models/CampusPosition");

const DEFAULT_CAMPUS_POSITIONS = [
  "Admin (Super)",
  "Admin",
  "Administrator",
  "Administrative Staff",
  "Assistant Professor",
  "Associate Professor",
  "Campus Manager",
  "Chancellor",
  "Dean" , 
  "Dean",
  "Head of Department (HOD)",
  "Department Coordinator",
  "Finance Officer / Bursar",
  "Graduate Assistant",
  "Head Librarian / Librarian",
  "IT Officer / Systems Administrator",
  "Lab Assistant / Lab Technician",
  "Lecturer",
  "Postdoctoral Fellow / Research Fellow",
  "Program Coordinator",
  "Professor",
  "Registrar",
  "Research Assistant / Research Associate",
  "Student Representative / Student Leader",
  "Teaching Assistant (TA)",
  "Vice Chancellor (VC)",
  "Vice Dean",
  "Warden (Hostel / Campus Housing)",
  "Workshop Supervisor / Technical Staff",
];

const ensureCampusPositions = async () => {
  const normalizedNames = DEFAULT_CAMPUS_POSITIONS.map((name) => name.trim().toLowerCase());

  await Promise.all(
    DEFAULT_CAMPUS_POSITIONS.map((name) => {
      const normalizedName = name.trim().toLowerCase();
      return CampusPosition.updateOne(
        { normalizedName },
        { $set: { name, normalizedName, active: true } },
        { upsert: true }
      );
    })
  );

  await CampusPosition.updateMany(
    { normalizedName: { $nin: normalizedNames } },
    { $set: { active: false } }
  );

  console.log("Campus positions synchronized");
};

module.exports = { ensureCampusPositions };
