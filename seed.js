require('dotenv').config();

const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');

const Teacher = require('./models/Teacher');
const Group = require('./models/Group');


async function seed() {

    try {

        // -----------------------------------------
        // Connect MongoDB
        // -----------------------------------------

        await connectDB();

        console.log('Connected to MongoDB');


        // -----------------------------------------
        // 1. Create groups
        // -----------------------------------------

        const groupNames = [
            'G22',
            'G23',
            'G24',
            'G25'
        ];

        const groups = {};

        for (const name of groupNames) {

            let group = await Group.findOne({ name });

            if (!group) {
                group = await Group.create({
                    name
                });

                console.log(`Created group: ${name}`);
            } else {
                console.log(`Group already exists: ${name}`);
            }

            groups[name] = group;
        }


        // -----------------------------------------
        // 2. Create teachers
        // -----------------------------------------

        const teacherPasswordHash = await bcrypt.hash(
            'teacher123',
            10
        );


        // -----------------------------------------
        // Teacher 1
        // -----------------------------------------

        let teacher1 = await Teacher.findOne({
            email: 'teacher1@presenz.com'
        });

        if (!teacher1) {

            teacher1 = await Teacher.create({
                name: 'Rahul Sharma',
                email: 'teacher1@presenz.com',
                passwordHash: teacherPasswordHash,

                assignedGroups: [
                    groups['G22']._id,
                    groups['G23']._id
                ]
            });

            console.log('Created teacher1');
        } else {

            teacher1.assignedGroups = [
                groups['G22']._id,
                groups['G24']._id
            ];

            await teacher1.save();

            console.log('Updated teacher1 groups');
        }


        // -----------------------------------------
        // Teacher 2
        // -----------------------------------------

        let teacher2 = await Teacher.findOne({
            email: 'teacher2@presenz.com'
        });

        if (!teacher2) {

            teacher2 = await Teacher.create({
                name: 'Priya Verma',
                email: 'teacher2@presenz.com',
                passwordHash: teacherPasswordHash,

                assignedGroups: [
                    groups['G24']._id,
                    groups['G25']._id
                ]
            });

            console.log('Created teacher2');

        } else {

            teacher2.assignedGroups = [
                groups['G24']._id,
                groups['G25']._id
            ];

            await teacher2.save();

            console.log('Updated teacher2 groups');
        }


        // -----------------------------------------
        // Print result
        // -----------------------------------------

        console.log('\n================================');
        console.log('SEED COMPLETE');
        console.log('================================\n');

        console.log('Teachers:');

        console.log({
            name: teacher1.name,
            email: teacher1.email,
            password: 'teacher123',
            groups: ['G22', 'G23']
        });

        console.log({
            name: teacher2.name,
            email: teacher2.email,
            password: 'teacher123',
            groups: ['G24', 'G25']
        });


        console.log('\nGroups:');

        for (const name of groupNames) {
            console.log(
                name,
                '->',
                groups[name]._id.toString()
            );
        }


        console.log('\nNo students were created.');

        process.exit(0);

    } catch (error) {

        console.error('\nSeed failed:');
        console.error(error);

        process.exit(1);
    }
}


seed();