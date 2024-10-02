import {
  Plugin,
  fetchPost,
  Setting
} from "siyuan";
import "@/index.scss";

const STORAGE_NAME = "sync-config";
const flomoSvg = '<svg t="1701609878223" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4530" width="200" height="200"><path d="M0 0h1024v1024H0z" fill="#FAFAFA" p-id="4531"></path><path d="M709.461 507.212H332.07V399.559h447.497l-65.422 105.264c0 2.389-2.342 2.389-4.684 2.389z m98.143-167.462H450.067l65.441-105.273c2.342 0 4.675-2.39 7.016-2.39h355.177l-65.422 105.264c0 2.399-2.342 2.399-4.684 2.399z" fill="#30CF79" p-id="4532"></path><path d="M337.91 791.912c-105.159 0-191.62-88.519-191.62-196.181s86.461-196.172 191.62-196.172c105.15 0 191.621 88.51 191.621 196.172s-86.47 196.172-191.62 196.172z m0-282.31c-46.743 0-86.47 38.276-86.47 88.518 0 47.853 37.394 88.529 86.47 88.529 49.067 0 86.462-38.286 86.462-88.529-2.342-50.242-39.727-88.519-86.471-88.519z" fill="#30CF79" p-id="4533"></path></svg>';

export default class FlomoSync extends Plugin {
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
      const noteContent = await this.getCurrentNoteContent();  // 获取当前笔记内容
      const apiData = {
        apiKey: this.data[STORAGE_NAME].apiKey,
        noteContent: noteContent
      };

      const response = await fetch(this.data[STORAGE_NAME].apiDomain + "/api/sync", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.data[STORAGE_NAME].apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
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
      icon: flomoSvg,
      title: "同步当前笔记到EMLOG",
      position: "right",
      callback: await this.syncCurrentNote.bind(this),
    });

    let apiKeyElement = document.createElement("input");
    let apiDomainElement = document.createElement("input");

    this.setting = new Setting({
      width: '500px',
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
      description: "请输入API密钥",
      createActionElement: () => {
        apiKeyElement.className = "b3-text-field fn__block";
        apiKeyElement.placeholder = "API密钥";
        apiKeyElement.value = this.data[STORAGE_NAME].apiKey || "";
        return apiKeyElement;
      },
    });

    this.setting.addItem({
      title: "API域名",
      description: "请输入API域名（带http/https）",
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

    // 设置headers
    const headers = {
      'Content-Type': 'application/json',
    };
    const accessCode = this.settingUtils.get("access_code");
    if (accessCode) {
      headers['Authorization'] = 'Token ' + accessCode;
    }

    try {
      const response = await axios_plus.post(url, data, { headers });
      const layout = response.data.data.conf.uiLayout.layout.children[0].children[1].children[0];
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
    const data = { id };
    let docTitle = "";

    // 设置headers
    const headers = {
      'Content-Type': 'application/json',
    };
    const accessCode = this.settingUtils.get("access_code");
    if (accessCode) {
      headers['Authorization'] = 'Token ' + accessCode;
    }

    try {
      const response = await axios_plus.post(url, data, { headers });
      docTitle = response.data.data.name;
    } catch (error) {
      console.error("获取文档标题时出错：", error);
    }

    return docTitle;
  }

  async onunload() {
    this.syncing = false;
  }
}