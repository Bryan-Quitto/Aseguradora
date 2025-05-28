

import Logo from "/src/assets/images/logos/logo.svg";
import { Link } from "react-router-dom";
const FullLogo = () => {
  return (
    <Link to={"/"}>
      <img src={Logo} alt="logo" className="block" />
    </Link>
  );
};

export default FullLogo;
