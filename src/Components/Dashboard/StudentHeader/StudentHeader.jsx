import React, { Component } from "react";
import "./StudentHeader.css";
import { auth } from "../../../firebase/config";
import menu from "../../../Img/menu.png";
class StudentHeader extends Component {
  constructor(props) {
    super();
  }

  logout = () => {
    console.log("Signing Out");
    auth.signOut().then(
      (success) => {
        this.props.history.push("/student/login");
      },
      (err) => {
        console.log(err, "error");
      }
    );
  };

  toggleMenu = () => {
    const e = document.getElementById("left-menu");
    e.classList.toggle("show-left-menu");
  };

  render() {
    return (
      <nav className="navbar header m-0 sticky-top justify-content-between">
        <img
          src={menu}
          alt="Menu"
          className="menu-icon"
          onClick={this.toggleMenu}
        />
        <div className="btn navber-link text-light" onClick={this.logout}>
          Logout
        </div>
      </nav>
    );
  }
}

export default StudentHeader;
