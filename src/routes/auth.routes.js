const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth.controller");

router.post("/check-email", controller.checkEmail);
router.post("/login", controller.login);
router.post("/register", controller.register);
router.post("/recover", controller.recover);

module.exports = router;
