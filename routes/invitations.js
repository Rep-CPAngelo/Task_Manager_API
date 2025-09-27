'use strict';

const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  invitationTokenParamSchema
} = require('../validations/boardSchemas');

/**
 * @swagger
 * components:
 *   schemas:
 *     BoardInvitation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Invitation ID
 *         board:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             title:
 *               type: string
 *             description:
 *               type: string
 *         invitedBy:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *             email:
 *               type: string
 *         invitedUser:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *             email:
 *               type: string
 *         email:
 *           type: string
 *           description: Email for email-based invitations
 *         role:
 *           type: string
 *           enum: [admin, member, viewer]
 *         status:
 *           type: string
 *           enum: [pending, accepted, declined, expired, cancelled]
 *         message:
 *           type: string
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/invitations/me:
 *   get:
 *     summary: Get current user's pending invitations
 *     tags: [Invitations]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User invitations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BoardInvitation'
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 */
router.get('/me', authMiddleware, boardController.getUserInvitations);

/**
 * @swagger
 * /api/invitations/{token}:
 *   get:
 *     summary: Get invitation details (public endpoint)
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token
 *     responses:
 *       200:
 *         description: Invitation details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     board:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                     invitedBy:
 *                       type: object
 *                       properties:
 *                         username:
 *                           type: string
 *                     role:
 *                       type: string
 *                     message:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     isExpired:
 *                       type: boolean
 *       404:
 *         description: Invitation not found or expired
 */
router.get('/:token', validate(invitationTokenParamSchema, 'params'), boardController.getInvitationDetails);

/**
 * @swagger
 * /api/invitations/{token}/accept:
 *   post:
 *     summary: Accept board invitation
 *     tags: [Invitations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Board'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invitation expired or cannot be accepted
 *       404:
 *         description: Invitation not found
 *       401:
 *         description: Authentication required
 */
router.post('/:token/accept', authMiddleware, validate(invitationTokenParamSchema, 'params'), boardController.acceptInvitation);

/**
 * @swagger
 * /api/invitations/{token}/decline:
 *   post:
 *     summary: Decline board invitation
 *     tags: [Invitations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation token
 *     responses:
 *       200:
 *         description: Invitation declined successfully
 *       400:
 *         description: Invitation cannot be declined
 *       404:
 *         description: Invitation not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 */
router.post('/:token/decline', authMiddleware, validate(invitationTokenParamSchema, 'params'), boardController.declineInvitation);

/**
 * @swagger
 * /api/invitations/{token}/join:
 *   post:
 *     summary: Join board via public sharing link
 *     tags: [Invitations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Sharing link token
 *     responses:
 *       200:
 *         description: Successfully joined the board
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Board'
 *                 message:
 *                   type: string
 *       400:
 *         description: Link expired or user already a member
 *       404:
 *         description: Invalid or expired link
 *       401:
 *         description: Authentication required
 */
router.post('/:token/join', authMiddleware, validate(invitationTokenParamSchema, 'params'), boardController.joinViaLink);

module.exports = router;