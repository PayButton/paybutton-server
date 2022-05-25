"use strict";
module.exports = {
  development: {
    username: "paybutton",
    password: "paybutton",
    database: "paybutton",
    host: process.env.DB_HOST || "db",
    dialect: "mysql",
  },
  test: {
    username: "paybutton-test",
    password: "paybutton-test",
    database: "paybutton-test",
    host: process.env.DB_HOST || "db",
    dialect: "mysql",
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql",
    dialectOptions: {
      ssl: true,
    },
  },
};
