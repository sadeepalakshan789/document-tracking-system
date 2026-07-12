const mongoose = require("mongoose");

const normalizePosition = (value = "") => value.trim().toLowerCase();

const campusPositionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, unique: true, index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

campusPositionSchema.pre("validate", function setNormalizedName() {
  this.normalizedName = normalizePosition(this.name);
});

module.exports = mongoose.model("CampusPosition", campusPositionSchema);
