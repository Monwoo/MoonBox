// Copyright Monwoo 2019, made by Miguel Monwoo, service@monwoo.com

// Structure inspired from :
// https://codeburst.io/js-data-structures-linked-list-3ed4d63e6571 by Arnav Aggarwal (2017)
// If you want to get a paid learning from him :
// https://www.educative.io/collection/5679346740101120/5707702298738688?authorName=Arnav%20Aggarwal
// Ts adaptation, reverse and tail stuff added by Miguel Monwoo 2019 (service@monwoo.com)
// Iterable feature inspired from :
// https://stackoverflow.com/questions/38508172/typescript-make-class-objects-iterable
// TODO : unit testings ?
export class Node<T = any> {
  v: T = null;
  next: Node<T> = null;
  prev: Node<T> = null;
  constructor(config: {}) {
    Object.assign(this, config);
  }
}
export class LinkedList<T = any> {
  head: Node<T> = null;
  tail: Node<T> = null;
  length: number = 0;
  constructor(...values: T[]) {
    this.addToHead(...values);
  }
  _addSingleItemToHead(value: T) {
    const newNode = new Node<T>({ v: value });
    newNode.next = this.head;
    if (!this.head) {
      this.tail = newNode;
    } else {
      this.head.prev = newNode;
    }
    this.head = newNode;
    this.length++;
  }
  addToHead(...values: T[]) {
    values.forEach(value => this._addSingleItemToHead(value));
    return this;
  }
  removeFromHead() {
    if (this.length === 0) {
      return undefined;
    }

    const value = this.head.v;
    this.head = this.head.next;
    if (!this.head) {
      this.tail = null;
    } else {
      this.head.prev = null;
    }
    this.length--;

    return value;
  }
  _addSingleItemToTail(value: T) {
    // TODO : not tested yet
    const newNode = new Node<T>({ v: value, prev: this.tail });
    if (!this.tail) {
      this.head = newNode;
    } else {
      this.tail.next = newNode;
    }
    this.tail = newNode;
    this.length++;
  }
  addToTail(...values: T[]) {
    values.forEach(value => this._addSingleItemToHead(value));
    return this;
  }
  removeFromTail() {
    if (this.length === 0) {
      return undefined;
    }

    const value = this.tail.v;
    this.tail = this.tail.prev;
    if (!this.tail) {
      this.head = null;
    } else {
      this.tail.next = null;
    }
    this.length--;

    return value;
  }
  find(val: T) {
    let thisNode = this.head;

    while (thisNode) {
      if (thisNode.v === val) {
        return thisNode;
      }

      thisNode = thisNode.next;
    }

    return thisNode;
  }

  remove(val: T) {
    if (this.length === 0) {
      return undefined;
    }

    if (this.head.v === val) {
      return this.removeFromHead();
    }

    let previousNode = this.head;
    let thisNode = previousNode.next;

    while (thisNode) {
      if (thisNode.v === val) {
        break;
      }

      previousNode = thisNode;
      thisNode = thisNode.next;
    }

    if (thisNode === null) {
      return undefined;
    }

    previousNode.next = thisNode.next;
    this.length--;
    return this;
  }

  // TS Not ready for static yet :
  // static IterableClass = class<T> implements Iterable<T> {

  all() {
    // Typescript not ready for static embed class (will work inside Class, can't export...):
    // Will give error that LinkedList is Type and not namespace if using LinkedList.IterableClass<T>
    // return new LinkedList.IterableClass<T>(this.head);
    return new IterableClass<T>(this.head);
  }
}
// Inspired from :
// https://stackoverflow.com/questions/32494174/can-you-create-nested-classes-in-typescript
// static IterableClass = class<T> implements Iterable<T> {
export class IterableClass<T> implements Iterable<T> {
  constructor(private itNode: Node<T>) {}
  public [Symbol.iterator]() {
    return {
      next: function() {
        const v = this.itNode ? this.itNode.v : undefined;
        this.itNode = this.itNode ? this.itNode.next : null;
        return {
          done: this.itNode === null,
          value: v
        };
      }.bind(this)
    };
  }
}
