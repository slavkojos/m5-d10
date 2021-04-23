import { Router } from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { getReviews, writeReviews } from "../lib/fs-tools.js";

import fs from "fs-extra";
import multer from "multer";
import { v4 as uniqid } from "uuid";

import { checkSchema, check, validationResult } from "express-validator";

const route = Router();
const currentWorkingFile = fileURLToPath(import.meta.url);
const currentWorkingDirectory = dirname(currentWorkingFile);

const publicFolderDirectory = join(currentWorkingDirectory, "../../public");

const productsDB = join(currentWorkingDirectory, "../db/products.json");
const reviewsDB = join(currentWorkingDirectory, "../db/reviews.json");

route.get("/", async (req, res, next) => {
  try {
    const reviews = await getReviews();

    if (req.query && req.query.comment) {
      let filteredReviews = reviews.filter(
        (review) =>
          review.hasOwnProperty("comment") &&
          review.comment.includes(req.query.comment)
      );
      res.send(filteredReviews);
    } else if (req.query && req.query.rate) {
      let filteredReviews = reviews.filter(
        (review) =>
          review.hasOwnProperty("rate") &&
          review.rate === parseInt(req.query.rate)
      );

      res.send(filteredReviews);
    } else {
      res.send(reviews);
    }
  } catch (error) {
    console.log(error);
    next(error); // SENDING ERROR TO ERROR HANDLERS (no httpStatusCode automatically means 500)
  }
});

route.get("/:id", async (req, res, next) => {
  //http://localhost:3002/students/123412312
  try {
    const reviews = await getReviews();

    const review = reviews.find((review) => review._id === req.params.id);
    if (review) {
      res.send(review);
    } else {
      const err = new Error("review not found");
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});
route.post(
  "/",
  [
    check("comment").exists().withMessage("Comment cannot be empty"),
    check("rate").isInt().withMessage("Rating must be an integer!"),
    check("productId").exists().withMessage("A product ID must be included"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // if we had errors
        const err = new Error();
        err.errorList = errors;
        err.httpStatusCode = 400;
        next(err);
      } else {
        const reviews = await getReviews();
        const newReview = { ...req.body, _id: uniqid(), createdAt: new Date() };

        reviews.push(newReview);

        await writeReviews(reviews);

        res.status(201).send({ _id: newReview._id });
      }
    } catch (error) {
      error.httpStatusCode = 500;
      next(error);
    }
  }
);
route.put("/:id", async (req, res, next) => {
  try {
    const reqId = req.params.id;
    const reviewsToEdit = await fs.readJSON(reviewsDB);
    const existenArrayOfReview = reviewsToEdit.filter((e) => e._id !== reqId);

    const newArrayOfReview = { ...req.body, id: reqId, modifedAt: new Date() };
    existenArrayOfReview.push(newArrayOfReview);

    await fs.writeJSON(reviewsDB, newArrayOfReview);
    res.status(201).send({ _id: newArrayOfReview._id });
  } catch (error) {
    console.log(error);
  }
});

route.delete("/:id", async (req, res, next) => {
  try {
    const reviews = await getReviews();

    const newReviews = reviews.filter((review) => review._id !== req.params.id);
    await writeReviews(newReviews);
    res.status(204).send();
  } catch (error) {
    console.log(error);
  }
});

export default route;
