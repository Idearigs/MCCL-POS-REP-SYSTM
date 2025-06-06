import express from 'express';
import { customerController } from '../controllers/customerController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all customer routes
router.use(authenticateJWT);

/**
 * @route POST /api/customers
 * @desc Create a new customer
 * @access Private
 */
router.post('/', customerController.createCustomer.bind(customerController));

/**
 * @route GET /api/customers
 * @desc Get all customers with optional search
 * @access Private
 */
router.get('/', customerController.getCustomers.bind(customerController));

/**
 * @route GET /api/customers/:id
 * @desc Get a customer by ID
 * @access Private
 */
router.get('/:id', customerController.getCustomerById.bind(customerController));

/**
 * @route PUT /api/customers/:id
 * @desc Update a customer
 * @access Private
 */
router.put('/:id', customerController.updateCustomer.bind(customerController));

/**
 * @route DELETE /api/customers/:id
 * @desc Delete a customer
 * @access Private
 */
router.delete('/:id', customerController.deleteCustomer.bind(customerController));

export default router;
