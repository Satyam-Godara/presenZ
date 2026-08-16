const express = require('express');
const Group = require('../models/Group');

const router = express.Router();


// GET /api/group
router.get('/', async (req, res) => {

    try {

        const groups = await Group.find({})
            .select('_id name')
            .sort({ name: 1 });

        return res.json(
            groups.map(group => ({
                id: group._id,
                name: group.name
            }))
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: 'Server error'
        });
    }
});


module.exports = router;