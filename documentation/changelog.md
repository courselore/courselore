# 4.0.0

**2022-07-09**

Courselore 4.0.0 introduces the notion of an administrative interface for you, system administrator. For now it includes only one setting, allowing you to control who’s able to create courses. Moving forward, we’ll have more settings for you to manage & collect statistics about your Courselore installation easily 🎉

Update to Courselore 4.0.0 with the following steps:

1. Make sure you, system administrator, have an account in Courselore. If you don’t have an account, create one before continuing. Even if you don’t intend on participating on courses, your user will be a system administrator.

2. Backup. Always backup before updates.

3. Update the configuration file according to `configuration/example.mjs`. Note how the configuration file is much simpler now, asking just for essential information. We hope that moving forward this will minimize the changes you’ll have to make to the configuration file, avoiding major and minor updates that demand more of your attention.

4. The first time you run Courselore after the update, run it manually from an interactive command line. Don’t run it from your process manager, for example, systemd. Courselore will prompt you for some information. When Courselore has started successfully you may shut it down and restart it using your process manager.

Enjoy!
