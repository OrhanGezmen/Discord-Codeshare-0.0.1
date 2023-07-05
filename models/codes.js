const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const codeSchema = new Schema({
  codeTitle: { type: String, require: true },
  shortDescription: { type: String, require: true },
  codeId: { type: String, require: true },
  codeDescription: { type: String, require: true },
  userId: { type: String, require: true },
  codeText: { type: String, require: true },
  codePhoto: { type: String, require: true },
  codeCategory: { type: String, require: true },
  codeOwner: { type: String, require: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Code", codeSchema);
