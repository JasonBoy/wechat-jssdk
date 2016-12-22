'use strict';

const bootstrap = require('./bootstrap');

const should = bootstrap.should;

const Wechat = require('../lib');
const Store = Wechat.Store;
const FileStore = Wechat.FileStore;
const MongoStore = Wechat.MongoStore;

const fileStore = new FileStore({
  fileStorePath: './wechat-info-' + Math.random() + '.json',
});

const mongoStore = new MongoStore();

describe('FileStore', function () {
  it('should flush the store', function (done) {
    fileStore.on(Store.StoreEvents.STORE_FLUSHED, function (result) {
      result.should.be.equal(true);
      done();
    });
    fileStore.emit(Store.StoreEvents.FLUSH_STORE);
  });

  it('should failed to flush file store', function (done) {
    fileStore.fileStorePath = './invalid/invalid_path';
    fileStore.flush();
    done();
  });

  it('should destroy the store', function (done) {
    fileStore.on(Store.StoreEvents.DESTROYED, function (result) {
      result.should.be.equal(true);
      should.not.exist(fileStore.store);
      done();
    });
    fileStore.emit(Store.StoreEvents.DESTROY);
  });


});

mongoStore.on('initialized', function () {
  describe('MongoStore', function () {
    this.timeout(20000);
    it('should flush the store', function (done) {
      mongoStore.on(Store.StoreEvents.STORE_FLUSHED, function (result) {
        result.should.be.equal(true);
        done();
      });
      mongoStore.emit(Store.StoreEvents.FLUSH_STORE);
    });

    it('should destroy the store', function (done) {
      mongoStore.on(Store.StoreEvents.DESTROYED, function (result) {
        result.should.be.equal(true);
        should.not.exist(mongoStore.store);
        done();
      });
      mongoStore.emit(Store.StoreEvents.DESTROY);
    });

  });
});

const mongoStore2 = new MongoStore();
mongoStore2.on('initialized', function () {
  describe('MongoStore', function () {
    this.timeout(20000);
    it('should update the global token', function (done) {
      mongoStore2.getGlobalToken()
        .then((oldToken) => {
          const newToken = {
            accessToken: 'mock_access_token',
          };
          return mongoStore2.updateGlobalToken(newToken)
            .then((updatedToken) => {
              updatedToken.should.have.property('accessToken');
              updatedToken.accessToken.should.be.equal('mock_access_token');
              const newCount = oldToken.count + 1;
              newCount.should.be.equal(updatedToken.count);
            });
        })
        .then(() => done())
        .catch(() => done());
    });
  });
});

