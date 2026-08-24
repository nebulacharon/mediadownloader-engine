export const appState = {
    isAffiliateSessionTriggered: false,
    currentPayload: {
      title: "",
      videoUrl: null,
      platform: ""
    },
    resetSession() {
      this.isAffiliateSessionTriggered = false;
      this.currentPayload = { title: "", videoUrl: null, platform: "" };
    }
  };