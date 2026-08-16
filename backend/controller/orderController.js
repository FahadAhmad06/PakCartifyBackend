import Order from "../model/ordermodel.js";
import Product from "../model/productModel.js";
import user from "../model/userModel.js";
import handleAsyncError from "../midleware/handleasyncerror.js";
import HandleError from "../utils/handlerror.js";
import { sendEmail } from "../utils/sendEmail.js";
import { orderConfirmationEmailTemplate, orderDeliveredEmailTemplate } from "../utils/emaiTemplate.js";

// ! Create New Order
export const createOrder = handleAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.body.orderItems[0].product);

  if (!product) {
    return next(new HandleError("Product not Found", 404));
  }

  if (product.stock < 1) {
    return next(new HandleError("Product is out of stock", 400));
  }

  if (product.stock < req.body.orderItems[0].quantity) {
    return next(
      new HandleError(`Only ${product.stock} items left in stock`, 400),
    );
  }


  const {
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    couponCode,        
    discountAmount,
  } = req.body;

  const order = await Order.create({
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    couponCode,        
    discountAmount,    
    paidAt: Date.now(),
    user: req.user._id,
  });

  try {
    const html = orderConfirmationEmailTemplate({
      name: req.user.name,
      orderId: order._id,
      orderItems: order.orderItems,
      shippingInfo: order.shippingInfo,
      itemsPrice: order.itemsPrice,
      taxPrice: order.taxPrice,
      shippingPrice: order.shippingPrice,
      discountAmount: order.discountAmount,
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentInfo.id,
      orderDate: order.createdAt,
    });

    await sendEmail({
      email: req.user.email,
      subject: `Order Confirmed – PakCartify #${order._id.toString().slice(-6).toUpperCase()}`,
      html,
    });
  } catch (error) {
    console.error("Order confirmation email failed to send:", error.message);
  }

  res.status(201).json({
    success: true,
    order,
  });
});

// ! getsingle order details
export const getSingleOrder = handleAsyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email",
  );

  if (!order) {
    return next(new HandleError("Order Not Found with this Id", 404));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// ! All my orders
export const myOrders = handleAsyncError(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id });

  if (!orders) {
    return next(new HandleError("No Orders Found", 404));
  }

  res.status(200).json({
    success: true,
    orders,
  });
});

//  ! Get All Orders -- Admin
export const getAllOrders = handleAsyncError(async (req, res, next) => {
  const orders = await Order.find().populate("user", "name email");

  let totalAmount = 0;
  orders.forEach((order) => {
    totalAmount += order.totalPrice;
  });

  res.status(200).json({
    success: true,
    orders,
    totalAmount,
  });
});

// // ! Update Order Status -- Admin

// export const updateOrderStatus = handleAsyncError(async (req, res, next) => {
//     console.log(item.product);
//     const order= await Order.findById(req.params.id);

//     if(!order){
//         return next(new HandleError("Order Not Found with this Id", 404));
//     }

//     if(order.orderStatus === "Delivered"){
//         return next(new HandleError("You have already delivered this order", 404));
//     }

//     await Promise.all(order.orderItems.map(item => updateQuantity(item.product, item.quantity)));

//     order.orderStatus = req.body.status;

//     if(order.orderStatus === "Delivered"){
//         order.deliveredAt = Date.now();
//     }

//     await order.save({validateBeforeSave : false});

//     res.status(200).json({
//         success : true,
//         order
//     })
// })

// async function updateQuantity(id, quantity) {
//     const product = await Product.findById(id);

// if(!product){
//    return next(new HandleError("Product Not Found",404));
// }

//     product.stock -= quantity;

//     await product.save({validateBeforeSave : false});
// }

// ! 2nd Pattern and this is working fine

export const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email",
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const wasDelivered = order.orderStatus === "Delivered";

    if (req.body.status === "Shipped") {
      for (const item of order.orderItems) {
        await updateStock(item.product, item.quantity);
      }
    }

    order.orderStatus = req.body.status;

    if (req.body.status === "Delivered") {
      order.deliveredAt = Date.now();
    }

    await order.save({ validateBeforeSave: false });

    if (req.body.status === "Delivered" && !wasDelivered && order.user?.email) {
      try {
        const html = orderDeliveredEmailTemplate({
          name: order.user.name,
          orderId: order._id,
          orderItems: order.orderItems,
          deliveredAt: order.deliveredAt,
        });

        await sendEmail({
          email: order.user.email,
          subject: `Order Delivered – Share Your Review | PakCartify #${order._id.toString().slice(-6).toUpperCase()}`,
          html,
        });
      } catch (error) {
        console.error("Order delivered email failed to send:", error.message);
      }
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

async function updateStock(productId, quantity) {
  const product = await Product.findById(productId);

  if (!product) {
    console.log("PRODUCT NOT FOUND");
    return;
  }

  product.stock = product.stock - quantity;

  await product.save({ validateBeforeSave: false });
}

//  ! Delete Order -- Admin

export const deleteOrder = handleAsyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new HandleError("Order Not Found with this Id", 404));
  }

  if (!["Processing", "Delivered"].includes(order.orderStatus)) {
    return next(
      new HandleError(
        "Only Processing or Delivered orders can be deleted",
        400,
      ),
    );
  }

  await order.deleteOne();

  res.status(200).json({
    success: true,
    message: "Order Deleted Successfully",
  });
});

// ! Cancel Order -- User (Processing only)

export const cancelMyOrder = handleAsyncError(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new HandleError("Order Not Found with this Id", 404));
  }

  if (order.user.toString() !== req.user._id.toString()) {
    return next(new HandleError("You are not authorized to cancel this order", 403));
  }

  if (order.orderStatus !== "Processing") {
    return next(
      new HandleError("Only Processing orders can be cancelled", 400),
    );
  }

  await order.deleteOne();

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
  });
});
