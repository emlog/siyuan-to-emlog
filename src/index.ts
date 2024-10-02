import {
  Plugin,
  fetchPost,
  Setting
} from "siyuan";
import "@/index.scss";

import { SettingUtils } from "./libs/setting-utils";

const STORAGE_NAME = "sync-config";
const emlogSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><rect width="24" height="24" fill="#1E1E1E"/><rect width="24" height="24" fill="#4E73DF"/><rect x="4" y="6" width="16" height="12" fill="url(#pattern0_0_1)"/><defs><pattern id="pattern0_0_1" patternContentUnits="objectBoundingBox" width="1" height="1"><use xlink:href="#image0_0_1" transform="matrix(0.00833333 0 0 0.0111111 0.125 0)"/></pattern><image id="image0_0_1" width="90" height="90" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAYAAAA4qEECAAAACXBIWXMAAAsTAAALEwEAmpwYAAABtklEQVR4nO3cPUoDURhG4Yv4g8ZCEERJpRuwVDt34kLche5EEd2DNmIXSy2iGxBBOCIklQhGh3vn+3IOpM6dh5cwkElKMTMzs1gBS8Cg9TnSBqwAZ8A78AFcAtutz5UqYBm44HsjYNj6fNmRp4ldAXma2BWQp4ldAVnsisjTXHYFZLErIotdEVnsishiV0QWm3rI84tNfeT5w6Yd8vxg0x45Pzb9Qc6LTf+Q82H3GDkPdgDk+NiBkONiB0SOiT35tjpqt8BCCfLcxRuxOyh9D1ibPHcRueMSIeCGuD0BqyVCwBZwTbzugf0SLWAd2JvxNe4I7WjG990s8xTw3BF0nNu0FiG00KnCRQudKly00KnCRQudKly00KnCRQudKly00KnCRQudKly00KnCRQudKly00KnCRQudKly00KnCRQudKly00KnCRQudKly00KnCRQudKly00KnCRVeDHnX0W/CNSkeOGXDVAfK49XX0PuCkA+jz1tfR+4BF4O4fyK/ATuvrCBEwBB7+iHzY+vyhAgbAKfD4C+CXr48Ll9zNP4/t/vAXPd5dmJmZlQB9AmTA+Cmpj1a/AAAAAElFTkSuQmCC"/></defs></svg>';

export default class EmlogSync extends Plugin {

  private topBarElement: any;
  private syncing: boolean = false;
  settingUtils: SettingUtils;

  async pushMsg(msg) {
    fetchPost("/api/notification/pushMsg", { msg: msg });
  }

  async pushErrMsg(msg) {
    fetchPost("/api/notification/pushErrMsg", { msg: msg });
  }

  /**
   * 获取当前笔记的内容并同步到API
   */
  async syncCurrentNote() {
    try {

      let pageId = await this.getActivePage();

      if (!pageId) {
        await this.pushErrMsg("没有找到当前页");
        return;
      }

      let docTitle = await this.getDocTitle(pageId);
      let docContent = await this.getDocContent(pageId);

      const formData = new FormData();
      formData.append('api_key', this.data[STORAGE_NAME].apiKey);
      formData.append('title', docTitle);
      formData.append('content', docContent);

      const response = await fetch(this.data[STORAGE_NAME].apiDomain + "/?rest-api=article_post", {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        await this.pushMsg("同步成功！");
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      await this.pushErrMsg("同步失败：" + error);
    }
  }

  async onload() {
    // 初始化配置数据
    this.data[STORAGE_NAME] = await this.loadData(STORAGE_NAME) || {};

    this.topBarElement = this.addTopBar({
      icon: emlogSvg,
      title: "同步当前笔记到EMLOG",
      position: "right",
      callback: await this.syncCurrentNote.bind(this),
    });

    // 当onLayoutReady()执行时，this.settingUtils被载入
    this.settingUtils = new SettingUtils(this, STORAGE_NAME);

    let apiKeyElement = document.createElement("input");
    let apiDomainElement = document.createElement("input");

    this.setting = new Setting({
      width: '600px',
      height: '300px',
      confirmCallback: async () => {
        let d = this.data[STORAGE_NAME];
        d.apiKey = apiKeyElement.value;
        d.apiDomain = apiDomainElement.value;
        await this.saveData(STORAGE_NAME, d);
      }
    });

    this.setting.addItem({
      title: "API密钥",
      description: "前往emlog后台系统->设置->API 查看密钥，并开启API",
      createActionElement: () => {
        apiKeyElement.className = "b3-text-field fn__block";
        apiKeyElement.placeholder = "API密钥";
        apiKeyElement.value = this.data[STORAGE_NAME].apiKey || "";
        return apiKeyElement;
      },
    });

    this.setting.addItem({
      title: "API域名",
      description: "请输入API域名（如：https://emlog.net,结尾不带斜杠）",
      createActionElement: () => {
        apiDomainElement.className = "b3-text-field fn__block";
        apiDomainElement.placeholder = "API域名";
        apiDomainElement.value = this.data[STORAGE_NAME].apiDomain || "";
        return apiDomainElement;
      },
    });
  }

  async getActivePage(): Promise<string> {
    // 获取当前页的ID
    const url = "api/system/getConf";
    const data = "{}";

    let activePageId = "";

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const accessCode = this.settingUtils.get("access_code");
    if (accessCode) {
      headers['Authorization'] = 'Token ' + accessCode;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: data,
        headers: headers
      });
      const result = await response.json();
      const layout = result.data.conf.uiLayout.layout.children[0].children[1].children[0];
      const activeChild = layout.children.find((child: any) => child.active);

      if (activeChild) {
        activePageId = activeChild.children.blockId;
      }
    } catch (error) {
      console.error("获取当前页ID时出错：", error);
    }

    return activePageId;
  }

  /**
   * 获取当前笔记的标题
   */
  async getDocTitle(id: string): Promise<string> {
    const url = "api/block/getDocInfo";
    const data = JSON.stringify({ id });

    let docTitle = "";

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const accessCode = this.settingUtils.get("access_code");
    if (accessCode) {
      headers['Authorization'] = 'Token ' + accessCode;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: data,
        headers: headers
      });
      const result = await response.json();
      console.log(result.data);
      docTitle = result.data.name;
    } catch (error) {
      console.error("获取文档标题时出错：", error);
    }

    return docTitle;
  }

  /**
   * 获取文档内容
   */
  async getDocContent(id: string): Promise<string> {
    const url = "api/export/exportMdContent";
    const data = JSON.stringify({ id });

    let result = "";

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const accessCode = this.settingUtils.get("access_code");
    if (accessCode) {
      headers['Authorization'] = 'Token ' + accessCode;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: data,
        headers: headers
      });
      const res = await response.json();
      result = res.data.content;
    } catch (error) {
      console.error("获取文档内容时出错：", error);
    }

    return result;
  }

  async onunload() {
    this.syncing = false;
  }
}