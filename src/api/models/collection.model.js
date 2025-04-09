import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const collectionSchema = mongoose.Schema(
  {
    userId: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    postsId: [
      {
        type: ObjectId,
        default: [],
        required: false,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Collection = mongoose.model("Collection", collectionSchema);

export default Collection;
