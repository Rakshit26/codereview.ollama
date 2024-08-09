# codereview.ollama

<p align="center">
  <img src="https://raw.githubusercontent.com/limingchina/codereview.ollama/main/public/icons/icon_128.png">
</p>
<p align='center'>
    Review GitHub Pull Requests or GitLab Merge Requests using <a href="https://github.com/ollama/ollama" target="_blank">Ollama</a>.
</p>
<p align='center'>
    <a href="https://github.com/limingchina/codereview.ollama/blob/main/LICENSE.txt">
        <img alt="GitHub"
        src="https://img.shields.io/github/license/sturdy-dev/codereview.gpt">
    </a>
</p>
<p align="center">
  <a href="#overview">🔍 Overview</a> •
  <a href="#usage">💻 Usage</a> •
  <a href="#faq">📖 FAQ</a> •
  <a href="#installation">🔧 Installation</a>
</p>

## Overview

This is a Chrome extension which reviews Pull Requests for you using [Ollama](https://github.com/ollama/ollama).

Here's an example output for [this](https://github.com/sturdy-dev/semantic-code-search/pull/17) Pull Request:

https://user-images.githubusercontent.com/4030927/207372123-46d7ee8c-bd3e-4272-8ccb-4639f9f71458.mp4

![example screenshot](https://raw.githubusercontent.com/limingchina/codereview.ollama/main/docs/codereview_gpt_screenshot_1.png)

## Usage

- Install [Ollama](https://github.com/ollama/ollama)
- In order to call the REST API from Ollama, one needs to enable CORS following the instructions [here](https://medium.com/dcoderai/how-to-handle-cors-settings-in-ollama-a-comprehensive-guide-ee2a5a1beef0)
- install some models using 'ollama pull'. For example, 'ollama pull llama3.1:8b'.
- One can pull multiple models and set the model that you want to use in the Settings of this Chrome Extension
- Go to a Github Pull Request web page or a Gitlab Merge Request web page, and click the extension icon
- You get code review comments from Ollama in the popup window. The result will be cached based on the Pull(Merge) Request URL. If you go to the same URL later and click the extension icon, it will be fetch the result from the cache. One can also click the "run again" button to re-run the review.

**NB:** Running the review multiple times often produces different feedback, so if you are dealing with a larger PR, it might be a good idea to do that to get the most out of it.

## FAQ

###

**Q:** Are the reviews 100% trustworthy?

**A:** No. This tool can help you spot bugs, but as with anything, use your judgement. Sometimes it hallucinates things that sound plausible but are false — in this case, re-run the review.

###

**Q:** What aspects of the Pull Request or Merge Request are considered during the review?

**A:** The model gets the code changes and the commit messages in a [patch](https://git-scm.com/docs/git-format-patch) format. Additionally it pulls in the description of the MR/PR.

###

**Q:** Does the extension post comments on the Pull Request page?

**A:** No. If you want any of the feedback as PR comments, you can copy paste the output.

###

###

**Q:** Why would you want this?

**A:** Plenty of reasons! You can:

    - pretend to work while playing games instead
    - appear smart to your colleagues
    - enable a future skynet
    - actually catch some bugs you missed
    - learn a thing or 2 on best practices

## Installation

You can install `codereview.ollama` build it from source locally.

### From source

- Clone this repository
- Install the dependencies `npm install`
- Run the build script `npm run build`
- Navigate to `chrome://extensions`
- Enable Developer Mode
- Click the 'Load unpacked' button and navigate to the `build` directory in the project

## Supported browsers

only Chrome is supported

## TODO list

- Add support to list the models of Ollama in Settings and in the popup window
- Add support to follow up the conversion in the popup window

## Permissions

This is a list of permissions the extension uses with the respective reason.

- `activeTab` is used to get the URL or the active tab. This is needed to fetch the get the Pull Request details
- `storage` is used to cache the responses from OpenAI
- `scripting` is used to fetch html content from the Merge Request / Pull Request

## Credits

This project is forked from [codereview.gpt](https://github.com/sturdy-dev/codereview.gpt)

## License

codereview.ollama is distributed under the [MIT](LICENSE.txt) license.
