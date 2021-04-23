import { query, Router } from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs-extra";
import multer from "multer";
import { v4 as uniqid } from "uuid";
import { checkSchema, validationResult, check } from "express-validator";
import checkFileType from "../middlewares/checkfiletype.js";
import { pipeline } from "stream";
import { promisify } from "util";
import sgMail from "@sendgrid/mail";
const route = Router();
const upload = multer();
import PdfPrinter from "pdfmake";
const asyncPipeline = promisify(pipeline);

const currentWorkingFile = fileURLToPath(import.meta.url);
const currentWorkingDirectory = dirname(currentWorkingFile);

const publicFolderDirectory = join(currentWorkingDirectory, "../../public");

const mediaDB = join(currentWorkingDirectory, "../db/media.json");
const reviewsDB = join(currentWorkingDirectory, "../db/reviews.json");
function capitalize(word) {
  return word[0].toUpperCase() + word.substring(1).toLowerCase();
}

export const sendEmail = async (emailAddress, subject, text) => {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: "slavkoj6@gmail.com",
      from: "slavkoj6@gmail.com",
      subject: "Sending with Twilio SendGrid is Fun",
      text: "and easy to do anywhere, even with Node.js",
      html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    };

    await sgMail.send(msg);
  } catch (error) {
    console.log(error);
  }
};
route.get("/catalogue", async (req, res, next) => {
  console.log("catalogue");
  try {
    const media = await fs.readJSON(mediaDB);
    const fonts = {
      Roboto: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
      },
    };
    const docDefinition = {
      content: [],
    };

    if (req.query && req.query.title) {
      const queryType = capitalize(Object.keys(req.query)[0]);
      const queryMedia = media.filter((e) => {
        return e[queryType].toLowerCase().includes(req.query[queryType.toLowerCase()]);
      });
      if (queryMedia) {
        docDefinition.content = JSON.stringify(queryMedia);
      }
    } else {
      docDefinition.content = JSON.stringify(media);
    }
    const printer = new PdfPrinter(fonts);

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const path = join(publicFolderDirectory, `${req.query.title}.pdf`);
    pdfDoc.pipe(fs.createWriteStream(path));
    pdfDoc.end();
    res.send({ message: "pdf generated", link: path });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

route.post("/sendCatalogue", async (req, res, next) => {
  console.log(req.body.email);
  const subject = join(publicFolderDirectory, `${req.body.title}.pdf`);
  try {
    await sendEmail(req.body.email, subject, "hello");
    res.send("Email sent!");
  } catch (error) {
    console.log(error);
    //next(error);
  }
});

route.get("/", async (req, res, next) => {
  const media = await fs.readJSON(mediaDB);
  if (req.query.title) {
    console.log(req.query);
    console.log("true");
    const queryType = capitalize(Object.keys(req.query)[0]);
    const queryMedia = media.filter((e) => {
      return e[queryType].toLowerCase().includes(req.query[queryType.toLowerCase()]);
    });
    if (queryMedia) {
      res.send(queryMedia);
    } else {
      res.send("wrong query");
    }
  } else if (req.query.year || req.query.type) {
    const queryType = capitalize(Object.keys(req.query)[0]);
    const queryMedia = media.filter((e) => {
      return e[queryType].toLowerCase() == req.query[queryType.toLowerCase()];
    });
    if (queryMedia) {
      res.send(queryMedia);
    } else {
      res.send("wrong query");
    }
  } else {
    res.send(media);
  }
});

route.get("/:id/reviews", async (req, res, next) => {
  try {
    const gettingReviews = await fs.readJSON(reviewsDB);
    console.log("sadsa: ", gettingReviews);
    const reqId = req.params.id;
    const grabbingTheReviews = gettingReviews.filter((e) => e.productId === reqId);
    if (grabbingTheReviews) {
      res.send(grabbingTheReviews);
    } else {
      res.send({ message: "No reviews" });
    }
  } catch (error) {
    console.log(error);
  }
});
route.put("/:id", async (req, res, next) => {
  try {
    const reqId = req.params.id;
    const productsToEdit = await fs.readJSON(mediaDB);
    const existenArrayOfProducts = productsToEdit.filter((e) => e.imdbID !== reqId);

    const newArrayOfProducts = { ...req.body, id: reqId };
    existenArrayOfProducts.push(newArrayOfProducts);

    await fs.writeJSON(mediaDB, newArrayOfProducts);
    res.status(201).send({ message: "successfully modified" });
  } catch (error) {
    console.log(error);
  }
});

route.delete("/:id", async (req, res, next) => {
  try {
    const reqId = req.params.id;
    const gettingProducts = await fs.readJSON(mediaDB);
    const deleteProducts = gettingProducts.filter((e) => e.imdbID !== reqId);

    await fs.writeJSON(mediaDB, deleteProducts);

    res.status(201).send({ message: "Successfully deleted" });
  } catch (error) {
    console.log(error);
  }
});
route.get("/:id", async (req, res, next) => {
  try {
    const products = await fs.readJSON(mediaDB);
    const product = products.find((product) => product.imdbID === req.params.id);
    if (product) {
      res.send(product);
    } else {
      const err = new Error("Product not found");
      err.httpStatusCode = 404;
      next(err);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

route.post("/:id/upload", upload.single("image"), checkFileType(["image/jpeg", "image/png", "image/jpg"]), async (req, res, next) => {
  try {
    const { originalname, buffer, size } = req.file;
    const finalDestination = join(publicFolderDirectory, originalname);
    await fs.writeFile(finalDestination, buffer);
    const link = `${req.protocol}://${req.hostname}:${process.env.PORT}/${originalname}`;
    const products = await fs.readJSON(mediaDB);
    const product = products.find((product) => product.imdbID === req.params.id);
    const oldProducts = products.filter((product) => product.imdbID !== req.params.id);
    product.Poster = link;
    product.updatedAt = new Date();
    oldProducts.push(product);
    await fs.writeJSON(mediaDB, products);
    res.send(link);
  } catch (err) {
    console.log(err);
    const error = new Error(err.message);
    error.httpStatusCode = 500;
    next(error);
  }
});

route.post(
  "/",
  [
    check("Title").exists().notEmpty().withMessage("Title is mandatory field"),
    check("Year").exists().notEmpty().withMessage("Year is mandatory field"),
    check("imdbID").exists().notEmpty().withMessage("imdbID is mandatory field"),
    check("Type").exists().notEmpty().withMessage("price is mandatory field"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      console.log(errors);
      if (!errors.isEmpty()) {
        const err = new Error();
        err.errorList = errors;
        err.httpStatusCode = 400;
        next(err);
      } else {
        const media = await fs.readJSON(mediaDB);
        const newMedia = {
          ...req.body,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        media.push(newMedia);
        await fs.writeJSON(mediaDB, media);
        res.status(201).send({
          id: newMedia.imdbID,
          message: "New media successfully created",
        });
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

export default route;
