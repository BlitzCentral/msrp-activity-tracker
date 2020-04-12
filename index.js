const config = require("./botconfig.json");
const Discord = require("discord.js");
const mysql = require('mysql');
const bot = new Discord.Client({disableEveryone: true});

var con = mysql.createPool({
    host: config.dbHost,
    user: config.dbUser,
    password: config.dbPass,
    database: config.database
});

dbConnect();

bot.onDutyTime = new Map();
bot.offDutyTime = new Map();

bot.on('message', async message => {

    if (message.author.bot) return;
    if (message.channel.type === "dm") return;

    let prefix = config.prefix;
    let messageArray = message.content.split(" ");
    let cmd = messageArray[0];
    let ChannelID = message.channel.id;

    if (!message.content.startsWith(prefix)) return;

    switch(cmd) {
        case `${prefix}onduty`:
        case `${prefix}clockin`:
            if (ChannelID === config.timeChannel) {
                if (message.member.roles.cache.has(config.role)) {
                    reply(message, 'use .offduty / .clockout to end your service');
                } else {
                    inDB(message.author.id).then((inDB) => {
                        if (!inDB) {
                          setTimeSQL(message.author.id, 0)
                        }
                      }).catch((err) => {})
                    onDuty(message);
                }
                cleanUp(message);
            } else {
                cleanUp(message);
                reply(message, `you can not run this command in this channel, please use <#` + config.timeChannel + `>`);
            }
            break;
        case `${prefix}offduty`:
        case `${prefix}clockout`:
            if (ChannelID === config.timeChannel) {
                if (!message.member.roles.cache.has(config.role)) {
                    reply(message, 'use .onduty / .clockin to end your service');
                } else {
                    offDuty(message);
                }
                cleanUp(message);
            } else {
                cleanUp(message);
                reply(message, `you can not run this command in this channel, please use <#` + config.timeChannel + `>`);
            }
            break;
        case `${prefix}gettime`:
        case `${prefix}time`:
            if (ChannelID === config.botCommandsChannel) {
                if (!message.mentions.users.size) {
                    cleanUp(message);
                    return reply(message, 'you must define a user to get their time');
                }
                cleanUp(message);
                let taggedUser = message.mentions.members.first();
                inDB(taggedUser.id).then((inDB) => {
                    if (!inDB) {
                      setTimeSQL(taggedUser.id, 0)
                      timeCMD(message, 0, taggedUser)
                    } else {
                        getTimeSQL(taggedUser.id).then(time => { 
                            timeCMD(message, time, taggedUser)
                        });
                    }
                  }).catch((err) => {});
            } else {
                cleanUp(message);
                reply(message, `you can not run this command in this channel, please use <#` + config.botCommandsChannel + `>`);
            }
            break;
        case `${prefix}settime`:
            if (ChannelID === config.botCommandsChannel) {
                if (!message.mentions.users.size) {
                    cleanUp(message);
                    reply(message, 'you must define a user to get their time')
                    return;
                } if (!isInt(messageArray[2])) {
                    cleanUp(message);
                    console.log(messageArray[2]);
                    reply(message, 'please provide a time');
                } else {
                    let taggedUser = message.mentions.members.first();
                    let time = messageArray[2];
                    inDB(taggedUser.id).then((inDB) => {
                        if (!inDB) {
                            setTimeSQL(taggedUser.id, time);
                            setTimeCMD(message, taggedUser, time);
                        } else {
                            updateTimeSQL(taggedUser.id, time);
                            setTimeCMD(message, taggedUser, time);
                        }
                      }).catch((err) => {});
                }
            } else {
                cleanUp(message);
                reply(message, `you can not run this command in this channel, please use <#` + config.botCommandsChannel + `>`)
            }
            break;
        case `${prefix}addtime`:
            if (ChannelID === config.botCommandsChannel) {
                if (!message.mentions.users.size) {
                    cleanUp(message);
                    reply(message, 'you must define a user to get their time')
                    return;
                } if (!isInt(messageArray[2])) {
                    cleanUp(message);
                    reply(message, 'please provide a time');
                } else {
                    let taggedUser = message.mentions.members.first();
                    let addTime = messageArray[2];
                    inDB(taggedUser.id).then((inDB) => {
                        if (!inDB) {
                            setTimeSQL(taggedUser.id, 0)
                        }
                      }).then(addTimeCMD(message, taggedUser, addTime)).catch((err) => {});
                }
            } else {
                cleanUp(message);
                reply(message, `you can not run this command in this channel, please use <#` + config.botCommandsChannel + `>`)
            }
            break;
        case `${prefix}toptimes`:
        case `${prefix}toptime`:
            if (ChannelID === config.botCommandsChannel) {
                if (!isInt(messageArray[1])) {
                    cleanUp(message);
                    reply(message, 'please provide an amount');
                } if (messageArray[1] > 30) {
                    cleanUp(message);
                    reply(message, 'amount must be 30 or below');
                } else {
                    cleanUp(message);
                    topTimeCMD(message, messageArray[1]);
                }
            } else {
                cleanUp(message);
                reply(message, `you can not run this command in this channel, please use <#` + config.botCommandsChannel + `>`);
            }
            break;
        case `${prefix}removetime`:
            if (ChannelID === config.botCommandsChannel) {
                if (!message.mentions.users.size) {
                    cleanUp(message);
                    reply(message, 'you must define a user to get their time')
                    return;
                } if (!isInt(messageArray[2])) {
                    cleanUp(message);
                    reply(message, 'please provide a time');
                } else {
                    let taggedUser = message.mentions.members.first();
                    let addTime = messageArray[2];
                    inDB(taggedUser.id).then((inDB) => {
                        if (!inDB) {
                            setTimeSQL(taggedUser.id, 0)
                        }
                      }).then(removeTimeCMD(message, taggedUser, addTime)).catch((err) => {});
                }
            } else {
                cleanUp(message);
                reply(message, `you can not run this command in this channel, please use <#` + config.botCommandsChannel + `>`)
            }
            break;
        case `${prefix}deletemember`:
        case `${prefix}deleteuser`:
            if (ChannelID === config.botCommandsChannel) {
                if (!message.mentions.users.size) {
                    cleanUp(message);
                    reply(message, 'you must define a user to get their time')
                    return;
                } else {
                    let taggedUser = message.mentions.members.first();
                    inDB(taggedUser.id).then((inDB) => {
                        if (!inDB) {
                            reply(message, 'member has no time on record');
                            return
                        } else {
                            deleteUserCMD(message, taggedUser);
                        }
                        cleanUp(message);
                      }).catch((err) => {});
                }
            } else {
                cleanUp(message);
                reply(message, `you can not run this command in this channel, please use <#` + config.botCommandsChannel + `>`)
            }
    }
});

function deleteUserCMD(message, taggedUser) {

    deleteUserSQL(taggedUser.id);

    const deleteUserDM = new Discord.MessageEmbed()
    .setColor(config.departmentColour)
    .setTitle(config.departmentTitle)
    .setURL(config.departmentURL)
    .setAuthor('Michigan State Roleplay', config.departmentLogo)
    .setDescription('Time Deleted')
    .addFields(
        { name: 'Officer', value: `<@${taggedUser.id}>`, inline: true },
        { name: 'Time/Date', value: message.createdAt, inline: true },
    )
    .addField('Run-By', '<@' + message.author.id + '>')
    .addField('Attention', 'If you believe this was done by mistake please contact a member of command.')
    .setTimestamp()
    .setFooter('Michigan State Roleplay', config.departmentLogo);

    const deleteUserMSG = new Discord.MessageEmbed()
        .setColor(config.departmentColour)
        .setTitle(config.departmentTitle)
        .setURL(config.departmentURL)
        .setAuthor('Michigan State Roleplay', config.departmentLogo)
        .setDescription('Member Deletion')
        .addFields(
            { name: 'Officer', value: `<@${taggedUser.id}>`, inline: true },
            { name: 'Time/Date', value: message.createdAt, inline: true },
        )
        .addField('Run-By', '<@' + message.author.id + '>')
        .setTimestamp()
        .setFooter('Michigan State Roleplay', config.departmentLogo);
    
    message.channel.send(deleteUserMSG);
    taggedUser.send(deleteUserDM);


} function removeTimeCMD(message, taggedUser, addTime) {
    getTimeSQL(taggedUser.id).then(time => {
        let total = parseInt(time) - parseInt(addTime);
        cleanUp(message); 
        updateTimeSQL(taggedUser.id, total);
        const removeTimeMSG = new Discord.MessageEmbed()
        .setColor(config.departmentColour)
        .setTitle(config.departmentTitle)
        .setURL(config.departmentURL)
        .setAuthor('Michigan State Roleplay', config.departmentLogo)
        .setDescription('Remove-Time')
        .addFields(
            { name: 'Officer', value: `<@${taggedUser.id}>`, inline: true },
            { name: 'Time/Date', value: message.createdAt, inline: true },
        )
        .addField('Time', secondsToHms(total))
        .addField('Run-By', '<@' + message.author.id + '>')
        .setTimestamp()
        .setFooter('Michigan State Roleplay', config.departmentLogo);
    
        message.channel.send(removeTimeMSG);
    }).catch(console.log);
} function topTimeCMD(message, int) {
    con.query('SELECT id,time FROM time ORDER BY time DESC LIMIT ' + int, (err, rows) => {
        if (err) throw err;

        var leaders = '';
        rows.forEach(function(row) {
            let id = row.id;
            let time = secondsToHmsLite(row.time);
            leaders += `<@${id}> - ${time}\n`;
        });

        const topTimeMSG = new Discord.MessageEmbed()
        .setColor(config.departmentColour)
        .setTitle(config.departmentTitle)
        .setURL(config.departmentURL)
        .setAuthor('Michigan State Roleplay', config.departmentLogo)
        .setDescription('Leaderboard')
        .addFields(
            { name: 'Results', value: `${leaders}`, inline: true },
        )
        .addField('Run-By', '<@' + message.author.id + '>')
        .setTimestamp()
        .setFooter('Michigan State Roleplay', config.departmentLogo);

        message.channel.send(topTimeMSG);
    });

} function addTimeCMD(message, taggedUser, addTime) {
    getTimeSQL(taggedUser.id).then(time => {
        let total = parseInt(time) + parseInt(addTime);
        cleanUp(message); 
        updateTimeSQL(taggedUser.id, total);
        const addTimeCMD = new Discord.MessageEmbed()
        .setColor(config.departmentColour)
        .setTitle(config.departmentTitle)
        .setURL(config.departmentURL)
        .setAuthor('Michigan State Roleplay', config.departmentLogo)
        .setDescription('Add-Time')
        .addFields(
            { name: 'Officer', value: `<@${taggedUser.id}>`, inline: true },
            { name: 'Time/Date', value: message.createdAt, inline: true },
        )
        .addField('Time', secondsToHms(total))
        .addField('Run-By', '<@' + message.author.id + '>')
        .setTimestamp()
        .setFooter('Michigan State Roleplay', config.departmentLogo);
    
        message.channel.send(addTimeCMD);
    }).catch(console.log);
} function setTimeCMD(message, taggedUser, time) {
    cleanUp(message); 
    const timeCMD = new Discord.MessageEmbed()
    .setColor(config.departmentColour)
    .setTitle(config.departmentTitle)
    .setURL(config.departmentURL)
    .setAuthor('Michigan State Roleplay', config.departmentLogo)
    .setDescription('Set-Time')
    .addFields(
        { name: 'Officer', value: taggedUser.displayName, inline: true },
        { name: 'Time/Date', value: message.createdAt, inline: true },
    )
    .addField('Time', secondsToHms(time))
    .addField('Set-By', '<@' + message.author.id + '>')
    .setTimestamp()
    .setFooter('Michigan State Roleplay', config.departmentLogo);

    message.channel.send(timeCMD);

} function timeCMD(message, time, taggedUser) {
    const timeCMD = new Discord.MessageEmbed()
    .setColor(config.departmentColour)
    .setTitle(config.departmentTitle)
    .setURL(config.departmentURL)
    .setAuthor('Michigan State Roleplay', config.departmentLogo)
    .setDescription('Time')
    .addFields(
        { name: 'Officer', value: `<@${taggedUser.id}>`, inline: true },
        { name: 'Time', value: secondsToHms(time), inline: true },
    )
    .setTimestamp()
    .setFooter('Michigan State Roleplay', config.departmentLogo);

    message.channel.send(timeCMD)

} function onDuty(message) {
    bot.onDutyTime.set(message.author.id, Date.now());
    const onDutyMSG = new Discord.MessageEmbed()
        .setColor(config.departmentColour)
        .setTitle(config.departmentTitle)
        .setURL(config.departmentURL)
        .setAuthor('Michigan State Roleplay', config.departmentLogo)
        .setDescription('Clock-in')
        .addFields(
            { name: 'Officer', value: `<@${message.member.id}>`, inline: true },
            { name: 'Time/Date', value: message.createdAt, inline: true },
        )
        .setTimestamp()
        .setFooter('Michigan State Roleplay', config.departmentLogo);
    message.channel.send(onDutyMSG);
    message.member.roles.add(config.role);

} function offDuty(message) {
    bot.offDutyTime.set(message.author.id, Date.now());
    let timeOnDuty = (bot.offDutyTime.get(message.author.id) - bot.onDutyTime.get(message.author.id)) / 1000;
    getTimeSQL(message.author.id).then(time => {
        const offDutyMSG = new Discord.MessageEmbed()
        .setColor(config.departmentColour)
        .setTitle(config.departmentTitle)
        .setURL(config.departmentURL)
        .setAuthor('Michigan State Roleplay', config.departmentLogo)
        .setDescription('Clock-Out')
        .addFields(
            { name: 'Officer', value: `<@${message.member.id}>`, inline: true },
            { name: 'Time/Date', value: message.createdAt, inline: true },
            { name: 'Duration', value: secondsToHms(timeOnDuty), inline: true },
        )
        .setTimestamp()
        .setFooter('Michigan State Roleplay', config.departmentLogo);

    message.channel.send(offDutyMSG);
    message.member.roles.remove(config.role);
    patrolLog(message, time, timeOnDuty);
    }).catch(console.log);
    
} function patrolLog (message, time, timeOnDuty) {
    const patrolLogMSG = new Discord.MessageEmbed()
    .setColor(config.departmentColour)
    .setTitle(config.departmentTitle)
    .setURL(config.departmentURL)
    .setAuthor('Michigan State Roleplay', config.departmentLogo)
    .setDescription('Patrol-Log')
    .addFields(
        { name: 'Officer', value: `<@${message.member.id}>`, inline: true },
        { name: 'Time/Date', value: message.createdAt, inline: true },
        { name: 'Duration', value: secondsToHms(timeOnDuty), inline: true },
        { name: 'Total', value: secondsToHms(time + timeOnDuty), inline: true },
    )
    .setTimestamp()
    .setFooter('Michigan State Roleplay', config.departmentLogo);

    bot.channels.cache.get(config.logChannel).send(patrolLogMSG);

    updateTimeSQL(message.author.id, time + timeOnDuty)
}

function getTimeSQL(id) {
    return new Promise(async (resolve, reject) => {
      await con.query(`SELECT * FROM time WHERE id = '${id}'`, (err, rows) => {
        if (err) return reject(err);
  
        let time = rows[0].time;
  
        return resolve(time);
      });
    });
} function inDB(id) {
    return new Promise(async (resolve, reject) => {
      await con.query(`SELECT * FROM time WHERE id = '${id}'`, (err, rows) => {
        if (err) return reject(err)

        return resolve(rows != 0);
      });
    });
} function setTimeSQL(id, time) {
    con.query(`INSERT INTO time (id, time) VALUES ('${id}', ${time})`);
} function deleteUserSQL(id) {
    con.query(`DELETE FROM time WHERE id = '${id}'`);
} function updateTimeSQL(id, time) {
    con.query(`UPDATE time SET time = ${time} WHERE id = '${id}'`);
} function dbConnect() {
    con.getConnection(function(error, tempCont) {
        if (!!error) {
            tempCont.release();
            console.log('Error conecting to DB');
            return
        } else {
            console.log('Connected to DB successfully!');
        }
    });
}
function secondsToHmsLite(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " h " : " h ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " m " : " m ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " s" : " s ") : "";
    if (d == 0) {
        return "0 s";
    } else {
        return hDisplay + mDisplay + sDisplay;
    }
}function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " hour " : " hours ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute " : " minutes ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    if (d == 0) {
        return "0 seconds";
    } else {
        return hDisplay + mDisplay + sDisplay;
    }
} function isInt(value) {
    return !isNaN(value) && 
           parseInt(Number(value)) == value && 
           !isNaN(parseInt(value, 10));
} function cleanUp(message) {
    try {
        message.channel.bulkDelete(1);
    } catch(error) {
        console.log("Error: Bot tried to delete message that didn't exist!");
    }
} function reply(message, msg) {message.reply(msg).then( msg => {msg.delete({ timeout: 5000 })});}

bot.on("ready", async () => {
    console.log("MSRP-Bot Version: 2.0")
    bot.user.setPresence({
        status: 'dnd',
        activity: {
            name: 'MSRP - Dev',
            type: 'WATCHING'
        }
    });
});

bot.on('error', console.error);
bot.login(config.token);