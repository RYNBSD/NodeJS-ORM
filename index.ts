import crypto from "node:crypto";
import timers from "node:timers/promises";
import Column from "./column";
import DataBase from "./db";
import Table from "./table";

const usersTable = new Table("users")
  .addColumn(
    new Column("id", { type: "INT", primaryKey: true, autoIncrement: true })
  )
  .addColumn(new Column("username", { type: "VARCHAR(255)", nullable: false }))
  .addColumn(
    new Column("email", {
      type: "VARCHAR(255)",
      nullable: false,
      unique: true,
    })
  )
  .addColumn(new Column("password", { type: "VARCHAR(255)", nullable: false }))
  .addColumn(
    new Column("createdAt", {
      type: "TIMESTAMP",
      nullable: false,
      default: "CURRENT_TIMESTAMP()",
    })
  )
  .addColumn(
    new Column("updatedAt", {
      type: "TIMESTAMP",
      nullable: false,
      default: "CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()",
    })
  );

const postsTable = new Table("posts")
  .addColumn(
    new Column("id", { type: "INT", primaryKey: true, autoIncrement: true })
  )
  .addColumn(new Column("title", { type: "VARCHAR(255)", nullable: false }))
  .addColumn(
    new Column("description", { type: "VARCHAR(1024)", nullable: false })
  )
  .addColumn(
    new Column("userId", {
      type: "INT",
      nullable: false,
      foreignKey: {
        table: usersTable.getTableName,
        column: usersTable.getColumnInfo("id").getColumnName,
        cascade: "onDelete",
      },
    })
  )
  .addColumn(
    new Column("createdAt", {
      type: "TIMESTAMP",
      nullable: false,
      default: "CURRENT_TIMESTAMP()",
    })
  )
  .addColumn(
    new Column("updatedAt", {
      type: "TIMESTAMP",
      nullable: false,
      default: "CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()",
    })
  );

const db = new DataBase({
  host: "localhost",
  user: "root",
  password: "",
  database: "node-orm",
})
  .addTable(usersTable)
  .addTable(postsTable);

(async () => {
  await db.connect();
  await db.createTables();

  await Promise.all(
    Array.from({ length: crypto.randomInt(1, 100) }, (_, i) =>
      db.insert("users", {
        username: `username ${crypto.randomInt(i)}`,
        email: `email ${crypto.randomInt(i)}`,
        password: `password ${crypto.randomInt(1)}`,
      })
    )
  );

  await timers.setTimeout(1000);

  const usersIdQuery = await db.select("users", { columns: ["id"] });
  const usersId = usersIdQuery.map((u) => u.id);

  await Promise.all(
    Array.from({ length: crypto.randomInt(1, 100) }, (_, i) =>
      db.insert("posts", {
        title: `title ${crypto.randomInt(i)}`,
        description: `description ${crypto.randomInt(i)}`,
        userId: usersId[Math.floor(usersId.length * Math.random())],
      })
    )
  );

  await timers.setTimeout(1000);

  const postsIdQuery = await db.select("posts", { columns: ["id"] });
  const postsId = postsIdQuery.map((u) => u.id);

  await Promise.all(
    Array.from({ length: crypto.randomInt(1, 100) }, (_, i) =>
      db.update("users", {
        sets: {
          username: `username ${crypto.randomInt(i)}`,
        },
        where: [
          ["id", "=", usersId[Math.floor(usersId.length * Math.random())]],
        ],
      })
    )
  );

  await timers.setTimeout(1000);

  await Promise.all(
    Array.from({ length: crypto.randomInt(1, 100) }, (_, i) =>
      db.update("posts", {
        sets: {
          title: `title ${crypto.randomInt(i)}`,
          description: `description ${crypto.randomInt(i)}`,
        },
        where: [
          ["id", "=", postsId[Math.floor(postsId.length * Math.random())]],
        ],
      })
    )
  );

  await timers.setTimeout(1000);

  await Promise.all(
    Array.from({ length: crypto.randomInt(1, 100) }, () =>
      db.delete("users", {
        where: [
          ["id", "=", usersId[Math.floor(usersId.length * Math.random())]],
        ],
      })
    )
  );

  await timers.setTimeout(1000);

  await Promise.all(
    Array.from({ length: crypto.randomInt(1, 100) }, () =>
      db.delete("posts", {
        where: [
          ["id", "=", postsId[Math.floor(postsId.length * Math.random())]],
        ],
      })
    )
  );

  await timers.setTimeout(1000);

  await db.disconnect();
})();
