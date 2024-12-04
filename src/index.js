var express = require("express");
var mysql = require("mysql");
var app = express();
app.use(express.json());
require("dotenv").config();
const { check, validationResult } = require("express-validator");

const con = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

con.getConnection((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("connected !!");
  }
});

app.post(
  "/addSchool",
  [
    check("id").isNumeric().withMessage("ID must be a number"),
    check("name").notEmpty().withMessage("Name is required"),
    check("address").notEmpty().withMessage("Address is required"),
    check("latitude").isFloat().withMessage("Invalid latitude"),
    check("longitude").isFloat().withMessage("Invalid longitude"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, name, address, latitude, longitude } = req.body;
    con.query(
      "INSERT INTO schooldata_table VALUES (?,?,?,?,?)",
      [id, name, address, latitude, longitude],
      (err, result) => {
        if (err) {
          console.log(err);
          res.status(500).send("Error adding school");
        } else {
          res.send("SCHOOL ADDED");
        }
      }
    );
  }
);

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const phi1 = lat1 * (Math.PI / 180);
  const phi2 = lat2 * (Math.PI / 180);
  const deltaPhi = (lat2 - lat1) * (Math.PI / 180);
  const deltaLambda = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Angular distance in radians
  const distance = R * c; // Distance in kilometers
  return distance;
}

app.get("/listSchools", (req, res) => {
  const userLatitude = req.query.latitude;
  const userLongitude = req.query.longitude;

  if (isNaN(userLatitude) || isNaN(userLongitude)) {
    return res.status(400).send("Invalid latitude or longitude");
  }

  const query = "SELECT * FROM schooldata_table";
  con.query(query, (err, schools) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error fetching schools from database");
    } else {
      schools.forEach((school) => {
        school.distance = calculateDistance(
          userLatitude,
          userLongitude,
          school.latitude,
          school.longitude
        );
      });
      schools.sort((a, b) => a.distance - b.distance);
      res.send(schools);
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log(`Server running on port ${PORT}`);
  }
});
