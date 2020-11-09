const BasePostgres = require('./BasePostgres');
const UUID = require('uuid-int');

class OrderModel extends BasePostgres {
    constructor(options = {}) {
        super();
        this.ordersTable = options.ordersTable || 'orders'
        this.ordersItemsLinks = options.ordersItemsLinks || 'order_links'
    }

    getAll() {
        return this.query(`SELECT * FROM ${this.ordersTable};`)
    }

    getById(id) {
        return this.query(`SELECT * FROM ${this.ordersTable} WHERE id = $1;`, [id])
    }

    searchByEmail(email) {
        return this.query(`SELECT * FROM ${this.ordersTable}
        WHERE customer_email ~ $1;`, [email])
    }

    searchByDate(from, to) {
        return this.query(`SELECT * FROM ${this.ordersTable}
        WHERE (delivery_date > from AND delivery_date < to);`, [from, to])
    }

    insert(delivery_date, customer_email, item_id, id=UUID(0).uuid()) {
        return this.query(
            `WITH 
            a AS 
            ( INSERT INTO ${this.ordersTable}
                (id, delivery_date, customer_email)
                VALUES ($1, $2, $3)
                RETURNING id
            ),
            b AS
            ( INSERT INTO ${this.ordersItemsLinks} 
                (id, order_id, item_id)
                VALUES ($4, $1, $5)
                RETURNING id, order_id, item_id
            )
            SELECT
                a.id,
                b.item_id
            FROM a
            RIGHT JOIN b ON a.id = b.order_id;`, [id, delivery_date, customer_email, UUID(0).uuid(), item_id])
    }

    update(id, customer_email, delivery_date) {
        return this.query(`
            UPDATE ${this.ordersTable} SET
            (customer_email, delivery_date) = 
            ($1, $2)
            WHERE id = $3
            RETURNING *;`, [customer_email, delivery_date, id])
    }

    delete(id) {
        return this.query(`
            WITH 
            a AS 
            ( DELETE FROM ${this.ordersTable}
                WHERE id = $1
                RETURNING id
            ),
            b AS
            ( DELETE FROM ${this.ordersItemsLinks} 
                WHERE order_id IN (SELECT id FROM a)
                RETURNING id, order_id 
            )
            SELECT
                a.id,
                b.order_id
            FROM a
            LEFT JOIN b ON a.id = b.order_id;`, [id])
    }
}


module.exports = OrderModel;