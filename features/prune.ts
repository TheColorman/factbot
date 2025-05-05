import {
  Collection,
  DiscordAPIError,
  Message,
  TextChannel,
  ThreadChannel,
  User,
} from 'discord.js';

function isTextChannel(
  channel: Message<boolean>['channel'],
): channel is TextChannel | ThreadChannel {
  if (
    [
      'GUILD_PUBLIC_THREAD',
      'GUILD_PRIVATE_THREAD',
      'GUILD_TEXT',
      'GUILD_NEWS',
    ].includes(channel.type)
  )
    return true;
  return false;
}

async function tryDM(author: User, message: string) {
  try {
    const channel = await author.createDM();
    await channel.send(message);
  } catch (err) {
    console.error(err);
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function deleteAllMessagesInChannel(
  authorMessage: Message<boolean>,
) {
  const channel = authorMessage.channel;
  if (!isTextChannel(channel)) {
    authorMessage.reply('sorry i can only delete messages in text channels');
    return;
  }

  const authorId = authorMessage.author.id;
  const msgManager = channel.messages;
  let lastMessageId: string | undefined = authorMessage.id;
  let deletedCount = 0;

  console.log(`Deleting all messages by ${authorId} in ${channel.id}`);
  while (lastMessageId) {
    try {
      const messages: Collection<
        string,
        Message<boolean>
      > = await msgManager.fetch({
        limit: 100,
        before: lastMessageId,
      });
      console.log(`Got 100 messages`);

      lastMessageId = messages.last()?.id;
      const withAuthor = messages.filter(m => m.author.id === authorId);
      for (const message of withAuthor.values()) {
        await message.delete();
        deletedCount++;
        await sleep(1000);
      }

      await sleep(5000);
    } catch (err) {
      if (!(err instanceof DiscordAPIError)) {
        console.error(err);
        tryDM(
          authorMessage.author,
          "something weird happened when I tried to delete your messages and it didn't work :(",
        );
        return;
      }

      // Missing permission
      if (err.code === 50013) {
        tryDM(
          authorMessage.author,
          "i don't have permission to delete messages in that channel, try to convince a mod to give me permission",
        );
        return;
      }

      tryDM(
        authorMessage.author,
        "something weird happened when I tried to delete your messages and it didn't work :(",
      );
      console.error(err);
    }
  }

  console.log(
    `Finished deleting messages by ${authorId} in ${channel.id}. Deleted ${deletedCount} messages`,
  );
  tryDM(
    authorMessage.author,
    `I deleted all your messages in <#${channel.id}>. I deleted ${deletedCount} messages.`,
  );
}
