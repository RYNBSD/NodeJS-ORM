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

function randomNumber(start = 1, end?: number) {
  if (end) return Math.floor(start + (Date.now() % end));
  return (start || 1) * Date.now() * Math.random();
}

function sleep(second: number) {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}

(async () => {
  await db.connect();
  await db.createTables();

  await Promise.all(
    Array.from({ length: randomNumber(1, 100) }, (_, i) =>
      db.insert("users", {
        username: `username ${randomNumber(i)}`,
        email: `email ${randomNumber(i)}`,
        password: `password ${randomNumber(1)}`,
      })
    )
  );

  await sleep(1);

  const usersIdQuery = await db.select("users", { columns: ["id"] });
  const usersId = usersIdQuery.map((u) => u.id);

  await Promise.all(
    Array.from({ length: randomNumber(1, 100) }, (_, i) =>
      db.insert("posts", {
        title: `title ${randomNumber(1)}`,
        description: `description ${randomNumber(i)}`,
        userId: usersId[Math.floor(usersId.length * Math.random())],
      })
    )
  );

  await sleep(1);

  const postsIdQuery = await db.select("posts", { columns: ["id"] });
  const postsId = postsIdQuery.map((u) => u.id);

  await Promise.all(
    Array.from({ length: randomNumber(1, 100) }, (_, i) =>
      db.update("users", {
        sets: {
          username: `username ${randomNumber(i)}`,
        },
        where: [
          ["id", "=", usersId[Math.floor(usersId.length * Math.random())]],
        ],
      })
    )
  );

  await sleep(1);

  await Promise.all(
    Array.from({ length: randomNumber(1, 100) }, (_, i) =>
      db.update("posts", {
        sets: {
          title: `title ${randomNumber(1)}`,
          description: `description ${randomNumber(i)}`,
        },
        where: [
          ["id", "=", postsId[Math.floor(postsId.length * Math.random())]],
        ],
      })
    )
  );

  await sleep(1);

  await Promise.all(
    Array.from({ length: randomNumber(1, 100) }, () =>
      db.delete("users", {
        where: [
          ["id", "=", usersId[Math.floor(usersId.length * Math.random())]],
        ],
      })
    )
  );

  await sleep(1);

  await Promise.all(
    Array.from({ length: randomNumber(1, 100) }, () =>
      db.delete("posts", {
        where: [
          ["id", "=", postsId[Math.floor(postsId.length * Math.random())]],
        ],
      })
    )
  );

  await sleep(1);

  await db.disconnect();
})();
