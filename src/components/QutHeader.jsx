import qutLogo from "../assets/qut-logo.png";
import "./QutHeader.css";

function QutHeader() {
  return (
    <header className="qut-header">
      <img
        className="qut-header__logo"
        src={qutLogo}
        alt="Queensland University of Technology (QUT)"
        width="52"
        height="52"
      />
      <span className="qut-header__divider" aria-hidden="true" />
      <span className="qut-header__app-name">MailMagpie</span>
    </header>
  );
}

export default QutHeader;
