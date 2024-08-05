import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class LiveStreamPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Live Match'),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth > 800) {
            return Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Column(
                    children: [
                      Expanded(
                        flex: 2,
                        child: VideoPlayerSection(),
                      ),
                      Expanded(
                        flex: 1,
                        child: SingleChildScrollView(
                          child: MatchInfoSection(),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: ChatRoomSection(),
                ),
              ],
            );
          } else {
            return Column(
              children: [
                Expanded(
                  flex: 2,
                  child: VideoPlayerSection(),
                ),
                Expanded(
                  flex: 1,
                  child: SingleChildScrollView(
                    child: MatchInfoSection(),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: ChatRoomSection(),
                ),
              ],
            );
          }
        },
      ),
    );
  }
}

class VideoPlayerSection extends StatefulWidget {
  @override
  _VideoPlayerSectionState createState() => _VideoPlayerSectionState();
}

class _VideoPlayerSectionState extends State<VideoPlayerSection> {
  late VideoPlayerController _controller;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.network(
      'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_20mb.mp4',
    )..initialize().then((_) {
        setState(() {});
        _controller.play();
      });
  }

  @override
  void dispose() {
    super.dispose();
    _controller.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: _controller.value.isInitialized
          ? AspectRatio(
              aspectRatio: _controller.value.aspectRatio,
              child: VideoPlayer(_controller),
            )
          : Center(child: CircularProgressIndicator()),
    );
  }
}

class MatchInfoSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      color: Colors.grey[200],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SelectableText(
            '54,587次觀看   上次直播時間：5小時前',
            style: TextStyle(fontSize: 16),
          ),
          SizedBox(height: 8),
          SelectableText(
            '巴黎奧運轉播畫面請看公視主頻13台\n這裡是賽事聊天室喔~',
            style: TextStyle(fontSize: 16),
          ),
          Divider(),
          SelectableText(
            '觀看公視優質節目，請到公視+',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          LinkText(text: 'WEB版', url: 'https://www.ptsplus.tv'),
          LinkText(text: 'iOS版', url: 'https://ptsplus2023.pse.is/5vchtm'),
          LinkText(text: 'Android 版', url: 'https://ptsplus2023.pse.is/5kpb89'),
          Divider(),
          SelectableText(
            '☆深度娛樂與文化議題報導',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          LinkText(text: '劇夠', url: 'https://dramago.ptsplus.tv'),
          LinkText(text: '觀看問不同', url: 'https://issues.ptsplus.tv'),
          Divider(),
          SelectableText(
            '💡公視頻道官方直營線上商店，公視購→ https://shop.pts.org.tw/',
            style: TextStyle(fontSize: 14),
          ),
          SelectableText(
            '💡贊助公視，看見更好的未來 線上捐款連結→ https://friends.pts.org.tw/',
            style: TextStyle(fontSize: 14),
          ),
          Divider(),
          SelectableText(
            '公視 網路直播頻道',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          Row(
            children: [
              SocialIcon(icon: Icons.video_library, label: '視頻'),
              SocialIcon(icon: Icons.description, label: '簡介'),
              SocialIcon(icon: Icons.settings, label: '設置'),
              SocialIcon(icon: Icons.info, label: '信息'),
            ],
          ),
        ],
      ),
    );
  }
}

class LinkText extends StatelessWidget {
  final String text;
  final String url;

  LinkText({required this.text, required this.url});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        onTap: () {
          // 处理链接点击
        },
        child: SelectableText(
          '$text ▶ $url',
          style: TextStyle(color: Colors.blue, decoration: TextDecoration.underline),
        ),
      ),
    );
  }
}

class SocialIcon extends StatelessWidget {
  final IconData icon;
  final String label;

  SocialIcon({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(8),
      child: Column(
        children: [
          Icon(icon, size: 24),
          SelectableText(label, style: TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

class ChatRoomSection extends StatelessWidget {
  final List<String> messages = [
    '林好庭: 6',
    '洪欣德: 66666',
    'Esther Wang: 666666',
    '蔡沅君: 6',
    '徐玟茹: 台灣加油',
    '卓君: 今天現場比較沒有五星紅旗',
    '張震豪: 666',
    '林家寧: 6666665',
    'Andy Liu: 氣勢6666',
    'NyX: 6平',
    '凱文: 埃及這麼強嗎',
    '艾草之家: 艾農生物科技有限公司 一定會贏的~',
    '林家寧: 66666',
    '張震豪: 666',
    '徐玟茹: 加油',
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      color: Colors.grey[200],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SelectableText(
            '重要消息重播',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: messages.length,
              itemBuilder: (context, index) {
                return ListTile(
                  title: SelectableText(messages[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
