const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const oldExe = process.argv[2];
const newExe = process.argv[3];

setTimeout(() => {

    try {

        if (
            fs.existsSync(
                oldExe
            )
        ) {

            fs.unlinkSync(
                oldExe
            );

        }

        fs.copyFileSync(
            newExe,
            oldExe
        );

        execFile(
            oldExe
        );

        process.exit(0);

    } catch (err) {

        console.error(err);

        process.exit(1);

    }

}, 2000);