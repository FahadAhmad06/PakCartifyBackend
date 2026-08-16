import Product from "../model/productModel.js"
import HandleError from "../utils/handlerror.js"
import handleAsyncError from "../midleware/handleasyncerror.js";
import APIFunctionality from "../utils/apiFunctionality.js";
import product from "../model/productModel.js";
import {v2 as cloudinary} from "cloudinary";

//  Create Product -- Admin
export const createProduct = handleAsyncError(async (req, res, next) => {

    
    if (!req.files || !req.files.image) {
        return next(new HandleError("Please upload at least one product image", 400));
    }

    let files = req.files.image;
    if (!Array.isArray(files)) {
        files = [files];
    }

    const imageLinks = [];

    for (let i = 0; i < files.length; i++) {
        try {
            // Upload buffer to Cloudinary using data_uri
            const fileBase64 = `data:${files[i].mimetype};base64,${files[i].data.toString('base64')}`;
            const result = await cloudinary.uploader.upload(fileBase64, {
                folder: 'products'
            });
            imageLinks.push({
                public_id: result.public_id,
                url: result.secure_url
            });
        } catch (cloudErr) {
            console.error("Cloudinary upload error:", cloudErr.message);
            return next(new HandleError(`Image upload failed: ${cloudErr.message}`, 500));
        }
    }

    req.body.image = imageLinks;
    req.body.user = req.user.id;

    const product = await Product.create(req.body);

    res.status(201).json({
        success: true,
        product
    });

})

// ! Get All Products
export const getAllproducts = handleAsyncError(async (req, res, next) => {
    
    const resultsPerPage = 20;
    
    const apiFeatures = new APIFunctionality(Product.find(), req.query).search().filter();

    //  Getting filtered products count for pagination
    const filteredQuery= apiFeatures.query.clone();
    const ProductsCount = await filteredQuery.countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(ProductsCount / resultsPerPage);
    const Page = Number(req.query.page) || 1;

    if(Page > totalPages && ProductsCount > 0){
        return next(new HandleError("This page does not exist", 404));
    }
    
    // apply pagination after search and filter
    apiFeatures.pagination(resultsPerPage);
    const products = await apiFeatures.query;

    if(!products || products.length === 0){
        return next(new HandleError("Products Not Found", 404));
    }

    res.status(200).json({
        success : true,
        products,
        ProductsCount,
        resultsPerPage,
        totalPages,
        CurrentPage : Page
    })
})


// ! Update Product -- Admin\
export const updateProduct = handleAsyncError(async (req, res, next) => {

    let product = await Product.findById(req.params.id);

    if (!product) {
        return next(new HandleError("Product Not Found", 404));
    }

    // ---------- Update Images ----------
    if (req.files && req.files.image) {

        // Delete old images from Cloudinary
        for (let i = 0; i < product.image.length; i++) {
            await cloudinary.uploader.destroy(product.image[i].public_id);
        }

        let files = req.files.image;

        if (!Array.isArray(files)) {
            files = [files];
        }

        const imageLinks = [];

        for (let i = 0; i < files.length; i++) {

            const fileBase64 = `data:${files[i].mimetype};base64,${files[i].data.toString("base64")}`;

            const result = await cloudinary.uploader.upload(fileBase64, {
                folder: "products",
            });

            imageLinks.push({
                public_id: result.public_id,
                url: result.secure_url,
            });

        }

        req.body.image = imageLinks;

    }

    // ---------- Update Product ----------
    product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            new: true,
            runValidators: true,
        }
    );

    res.status(200).json({
        success: true,
        message: "Product Updated Successfully",
        product,
    });

});

// ! Delete Product -- Admin
export const deleteProduct = handleAsyncError(async (req, res, next) => {

    const product = await Product.findById(req.params.id)

    if(!product){
        return next(new HandleError("Product Not Found", 404));
    }

    // Delete images from Cloudinary
    for (let i = 0; i < product.image.length; i++) {
        await cloudinary.uploader.destroy(product.image[i].public_id);
    }

    await product.deleteOne();

    res.status(200).json({
        success : true,
        message : "Product Deleted Successfully"
    })
})

// ! Get Single Product Details
export const getSingleProductDetails = handleAsyncError(async (req, res, next) => {
    const product = await Product.findById(req.params.id)

    if(!product){
        return next(new HandleError("Product Not Found", 404));
    }
    
    res.status(200).json({
        success : true,
        product
    })
})


// ! Get All Products (Admin)

export const getAdminProducts =  handleAsyncError(async(req, res, next) => {

    console.log(req.query);
    const products = await Product.find();

    res.status(200).json({
        success : true,
        products
    })
})


// creating and updating reviews for product
export const createReviewandUpdate = handleAsyncError(async (req, res, next) => {

    const {rating, comment, productId} = req.body

    const review = {
        user : req.user._id,
        name : req.user.name,
        rating : Number(rating),
        comment 
    }

    
    const product = await Product.findById(productId);  
    
    if(!product){
        return next(new HandleError("Product Not Found", 400));
    }

    const reviewExist = product.reviews.find(review => review.user.toString() === req.user.id.toString());

    if(reviewExist){
        product.reviews.forEach(review => {
            if(review.user.toString() === req.user.id.toString()){
                review.rating = rating;
                review.comment = comment;
            }
        })
    }else{
        product.reviews.push(review);
        
    }

    product.numOfReviews = product.reviews.length;

    let sum = 0;

    product.reviews.forEach(review => {
        sum += review.rating;
    });

    product.ratings = sum / product.reviews.length ? sum / product.reviews.length : 0;

    await product.save({validateBeforeSave : false});

    res.status(200).json({
        success : true,
        message : "Review Added/Updated Successfully"
    })
    
})


// ! Get All Reviews of a Product
export const getAllReviews = handleAsyncError(async (req, res, next) => {
    const product = await Product.findById(req.query.id);

    if(!product){
        return next(new HandleError("Product Not Found", 400));
    }

    res.status(200).json({
        success : true,
        reviews : product.reviews
    })
})

// ! Delete Review of a Product
export const deleteReview = handleAsyncError(async (req, res, next) => {

    console.log(req.query);
    console.log(req.query.productId);

    const product = await Product.findById(req.query.productId);

    if (!product) {
        return next(new HandleError("Product Not Found", 400));
    }

    const reviews = product.reviews.filter(
        review => review._id.toString() !== req.query.id.toString()
    );

    let sum = 0;

    reviews.forEach(review => {
        sum += review.rating;
    });

    const ratings = reviews.length === 0 ? 0 : sum / reviews.length;

    const numOfReviews = reviews.length;

    await Product.findByIdAndUpdate(
        req.query.productId,
        {
            reviews,
            ratings,
            numOfReviews
        },
        {
            new: true,
            runValidators: true,
        }
    );

    res.status(200).json({
        success: true,
        message: "Review Deleted Successfully"
    });

});