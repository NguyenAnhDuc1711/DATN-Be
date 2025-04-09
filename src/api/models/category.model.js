import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  parentId: {
    type: ObjectId,
    required: false,
  },
});

const Category = mongoose.model("Categories", categorySchema);

export default Category;
