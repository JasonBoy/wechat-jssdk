const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(path.join(__dirname, '../db_test.json'));
const db = low(adapter);

const utils = require('../lib/utils');

function init() {
  // Set some defaults (required if your JSON file is empty)
  db.defaults({ posts: [], orders: [], user: {}, count: 0 }).write();

  // Add a post
  db
    .get('posts')
    .push({ id: utils.nonceStr(), title: 'lowdb is awesome2' })
    .write();

  db
    .get('orders')
    .push({ id: utils.nonceStr(), title: 'order 1' })
    .write();

  // Set a user using Lodash shorthand syntax
  db.set('user.name', 'typicode2').write();

  // Increment count
  db.update('count', n => n + 1).write();
}

function getState() {
  /*console.log(db.getState());
  console.log(db.has('orders').value());
  console.log(db.has('orders2').value());
  console.log(
    db
      .get('posts')
      .size()
      .value()
  );
  console.log(db.get('posts[0].title').value());
  console.log(
    db
      .get('posts')
      .cloneDeep()
      .value()
  );
  console.log(
    db
      .get('posts')
      .find({ id: 1 })
      .has('id2')
      .value()
  );*/
}

getState();
// init();
