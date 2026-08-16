import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please Enter Product Name"],
    trim: true,
    maxLength: [100, "Product name cannot exceed 100 characters"],
  },
  description: {
    type: String,
    required: [true, "Please Enter Product Description"],
    trim: true,
    maxLength: [200, "Product description cannot exceed 200 characters"],
  },
  price: {
    type: Number,
    required: [true, "Please Enter Product Price"],
    maxLength: [7, "Product price cannot exceed 7 characters"],
  },
  originalPrice: {
    type: Number,
    default: null,
  },
  showOriginalPrice: {
    type: Boolean,
    default: false,
  },
  ratings: {
    type: Number,
    default: 0,
  },
  image: [
    {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  category: {
    type: String,
    required: [true, "Please Enter Product Category"],
  },
  subcategory: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: [true, "Please Enter Product Stock"],
    maxLength: [5, "Product stock cannot exceed 5 characters"],
    default: 0,
  },
  numOfReviews: {
    type: Number,
    default: 0,
  },
  reviews: [
    {
      user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
      },

      name: {
        type: String,
        required: true,
      },
      rating: {
        type: Number,
        required: true,
      },
      comment: {
        type: String,
        required: true,
      },
    },
  ],

  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

export default mongoose.model("Product", productSchema);
