import axios from 'axios';

interface Error {
  name: string;
  stack: string;
  message: string;
}

class DiscordUtils {
  private static url = process.env.DISCORD_WEBHOOK;

  static async sendErrorMessage(error: Error) {
    return axios.post(this.url, {
      content: 'ℹ️ **API DOWN**',
      avatar_url:
        'https://pbs.twimg.com/profile_images/1701356759812554752/Ya-XMqEe_400x400.jpg',
      embeds: [
        {
          title: 'Detalhes do Erro',
          color: 16711680,
          description: error.name ?? 'Sem descrição',
          fields: [
            {
              name: 'Mensagem de Erro',
              value: error.message ?? '',
            },
            {
              name: 'Stack Trace',
              value: '```' + JSON.stringify(error.stack ?? {}) + '```',
            },
          ],
        },
      ],
    });
  }
}

export { DiscordUtils };
