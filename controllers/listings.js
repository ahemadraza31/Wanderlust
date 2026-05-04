const Listing = require("../models/listing");
const fetch = require("node-fetch");

// Default geometry fallback when geocoding is unavailable
const defaultGeometry = {
  type: "Point",
  coordinates: [20.5937, 78.9629], // Fallback: Central India
};

// Free geocoding using OpenStreetMap Nominatim (no API key required)
async function getGeocoding(location, country) {
const query = encodeURIComponent(`${location}, ${country}, India`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
"User-Agent": "AirbnbClone/1.0 (ahemadrajapathan@example.com)",
      },
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        type: "Point",
        coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
      };
    }
  } catch (err) {
    console.log("Geocoding error:", err.message);
  }
  return defaultGeometry;
}

module.exports.index = async (req, res, next) => {
  let allListing = await Listing.find().sort({ _id: -1 });
  res.render("listings/index.ejs", { allListing });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.createListing = async (req, res, next) => {
  let geometry = await getGeocoding(
    req.body.listing.location,
    req.body.listing.country
  );
  let url = req.file.path;
  let filename = req.file.filename;
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };
  newListing.geometry = geometry;
  await newListing.save();
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
};

module.exports.showListing = async (req, res, next) => {
  let { id } = req.params;
  let listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    res.redirect("/listings");
  }
  console.log(listing);
  res.render("listings/show.ejs", { listing });
};

module.exports.renderEditForm = async (req, res, next) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);
  let originalImage = listing.image.url;
  originalImage = originalImage.replace("/upload", "/upload/w_200,h_150");
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    res.redirect("/listings");
  }
  res.render("listings/edit.ejs", { listing, originalImage });
};

module.exports.updateListing = async (req, res, next) => {
  let { id } = req.params;
  let updateListing = req.body.listing;
  let listing = await Listing.findByIdAndUpdate(id, updateListing);

  try {
    let geometry = await getGeocoding(
      req.body.listing.location,
      req.body.listing.country
    );
    listing.geometry = geometry;
    await listing.save();
  } catch (err) {
    console.log("Geocoding error:", err.message);
  }

  if (typeof req.file != "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
    await listing.save();
  }
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res, next) => {
  let { id } = req.params;
  let deleteListing = await Listing.findByIdAndDelete(id);
  console.log(deleteListing);
  req.flash("success", "Listing Deleted!");
  console.log("delete");
  res.redirect("/listings");
};

module.exports.filter = async (req, res, next) => {
  let { id } = req.params;
  let allListing = await Listing.find({ category: { $all: [id] } });
  console.log(allListing);
  if (allListing.length != 0) {
    res.locals.success = `Listings Find by ${id}`;
    res.render("listings/index.ejs", { allListing });
  } else {
    req.flash("error", "Listings is not here !!!");
    res.redirect("/listings");
  }
};

module.exports.filterbtn = (req, res, next) => {
  res.render("listings/filterbtn.ejs");
};

module.exports.search = async (req, res) => {
  console.log(req.query.q);
  let input = req.query.q.trim().replace(/\s+/g, " "); // remove start and end space and middle space remove and middle add one space------
  console.log(input);
  if (input == "" || input == " ") {
    //search value empty
    req.flash("error", "Search value empty !!!");
    res.redirect("/listings");
  }

  // convert every word 1st latter capital and other small---------------
  let data = input.split("");
  let element = "";
  let flag = false;
  for (let index = 0; index < data.length; index++) {
    if (index == 0 || flag) {
      element = element + data[index].toUpperCase();
    } else {
      element = element + data[index].toLowerCase();
    }
    flag = data[index] == " ";
  }
  console.log(element);

  let allListing = await Listing.find({
    title: { $regex: element, $options: "i" },
  });
  if (allListing.length != 0) {
    res.locals.success = "Listings searched by Title";
    res.render("listings/index.ejs", { allListing });
    return;
  }
  if (allListing.length == 0) {
    allListing = await Listing.find({
      category: { $regex: element, $options: "i" },
    }).sort({ _id: -1 });
    if (allListing.length != 0) {
      res.locals.success = "Listings searched by Category";
      res.render("listings/index.ejs", { allListing });
      return;
    }
  }
  if (allListing.length == 0) {
    allListing = await Listing.find({
      country: { $regex: element, $options: "i" },
    }).sort({ _id: -1 });
    if (allListing.length != 0) {
      res.locals.success = "Listings searched by Country";
      res.render("listings/index.ejs", { allListing });
      return;
    }
  }
  if (allListing.length == 0) {
    let allListing = await Listing.find({
      location: { $regex: element, $options: "i" },
    }).sort({ _id: -1 });
    if (allListing.length != 0) {
      res.locals.success = "Listings searched by Location";
      res.render("listings/index.ejs", { allListing });
      return;
    }
  }
  const intValue = parseInt(element, 10); // 10 for decimal return - int ya NaN
  const intDec = Number.isInteger(intValue); // check intValue is Number & Not Number return - true ya false

  if (allListing.length == 0 && intDec) {
    allListing = await Listing.find({ price: { $lte: element } }).sort({
      price: 1,
    });
    if (allListing.length != 0) {
      res.locals.success = `Listings searched for less than Rs ${element}`;
      res.render("listings/index.ejs", { allListing });
      return;
    }
  }
  if (allListing.length == 0) {
    req.flash("error", "Listings is not here !!!");
    res.redirect("/listings");
  }
};
