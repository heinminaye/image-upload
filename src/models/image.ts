import mongoose, { Schema } from 'mongoose';

const ImageSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    size: {
      type: Number,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'fs.files', // reference to GridFS files collection
    },
    width: {
      type: Number,
      required: false,
    },
    height: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        // Remove unwanted fields from the JSON output
        delete ret.__v;
        delete ret.createdAt;
        delete ret.updatedAt;
        delete ret._id;
        return ret;
      }
    },
    toObject: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        delete ret.createdAt;
        delete ret.updatedAt;
        delete ret._id;
        return ret;
      }
    }
  }
);

// Virtual field to generate URL for image access
ImageSchema.virtual('url').get(function () {
  // Customize this URL based on API route
  return `/api/images/${this.fileId}`;
});

export default mongoose.model('Image', ImageSchema);
