const fs = require("fs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Tour = require("../models/tourModel");

const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => {
  console.log("DB connection successful");
});

//READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, "utf-8"));

//IMPORT INTO THE DATA BASE
const importData = async () => {
  try {
    await Tour.create(tours);
    console.log("data succefully loaded");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

//DELETE ALL DATA FROM COLLECETION
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    console.log("data deleted succefully");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === "--import") {
  importData();
  console.log(process.argv);
} else if (process.argv[2] === "--delete") {
  console.log(process.argv);
  deleteData();
}
