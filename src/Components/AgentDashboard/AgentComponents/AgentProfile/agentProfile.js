import { firestore } from "firebase";
import React from "react";
import { DisplayProfile } from "./displayProfile";
import Select from "react-select";
import { auth, storage } from "../../../../firebase/config";
import { Error } from "../../../Error/error";
import "./styles.css";

export default class AgentProfile extends React.Component {
  downloadUrls = null;
  state = {
    loading: true,
    profile: {
      verified: true,
      recruitFrom: [],
    },
    verified: false,
    countries: null,
    profileExist: false,
    btnLoading: false,
    error: {
      exist: false,
      msg: null,
    },
  };
  handleChange = (e) => {
    let name = e.target.name;
    let val = e.target.value;
    this.setState((s) => ({
      profile: {
        ...s.profile,
        [name]: val,
      },
    }));
  };

  // storageHandler = async (files) => {
  //   if (!files || !this.state.user) {
  //     return;
  //   }
  storageHandler = (files) =>
    new Promise((res, rej) => {
      let downloadUrls = new Object();
      if (files.length > 0) {
        storage.ref(`/agentImages/${this.state.user.uid}/`).delete();

        files.map(async (file) => {
          const task = storage
            .ref(`/agentImages/${this.state.user.uid}/${file.name}`)
            .put(file.file);
          task.on(
            "state_changed",
            () => console.log(""),
            (err) => {
              console.log(err);
              this.setState({
                loading: false,
                btnLoading: false,
                error: { exist: true, msg: err.message },
              });
            },
            async () => {
              console.log("FILE CALLBACK");
              const doc = storage.ref(
                `agentImages/${this.state.user.uid}/${file.name}`
              );
              doc
                .getDownloadURL()
                .then(async (url) => {
                  return await url;
                })
                .then((u) => {
                  console.log(u);
                  downloadUrls[file.name] = u;
                });
            }
          );
        });

        res(downloadUrls);
      } else {
        res(null);
      }
    });

  hanldeFileChange = (e) => {
    let file = e.target.files[0];
    let name = e.target.name;
  };
  componentDidMount() {
    auth.onAuthStateChanged((u) => {
      if (!u) {
        this.setState({ user: null, loading: false });
        return;
      }
      console.log(u);
      firestore()
        .collection("Agents")
        .doc(`${u.uid}`)
        .get()
        .then((doc) => {
          if (doc.exists) {
            this.checkAgentProfile(u);
            this.setState({ user: u }, () => {
              console.log("HERE");
            });
          } else {
            console.log("NOT HERE");

            this.setState({ user: null, loading: false });
          }
        })
        .catch((e) => {
          this.setState({
            loading: false,
            error: {
              exist: true,
              msg: e.message,
            },
          });
        });
    });
    fetch("https://restcountries.eu/rest/v2/all?fields=name;")
      .then((res) => res.json())
      .then((res) => {
        let countries = res.map((country) => ({
          value: country.name,
          label: country.name,
        }));
        this.setState({
          countries: countries,
        });
      })
      .catch((e) => {
        this.setState({
          loading: false,
          error: {
            exist: true,
            msg: e.message,
          },
        });
      });
  }
  checkAgentProfile = (u) => {
    if (!u) return;
    firestore()
      .collection("Agents")
      .doc(`${u.uid}`)
      .collection("Profile")
      .doc("Details")
      .get()
      .then((doc) => {
        if (!doc.exists) {
          console.log("DAHBOARD PROFILE NOT EXIXT");
          this.setState({ profileExist: false, loading: false });
          return;
        }
        let check = Object.keys(doc.data()).length;
        if (check > 0) {
          console.log("PROFILE PROFILE EXIST");

          this.setState({
            profileExist: true,
            loading: false,
            profile: doc.data(),
          });
          return;
        } else {
          console.log("PROFILE PROFILE NO");
          this.setState({ profileExist: false, loading: false });
          return;
        }
      })
      .catch((e) => {
        this.setState({
          loading: false,
          error: {
            exist: true,
            msg: e.message,
          },
        });
      });
  };
  handleSubmit = async (e) => {
    e.preventDefault();
    this.setState({ btnLoading: true });
    let buisnessCertificate = e.target.b_certificate.files[0];
    let companyLogo = e.target.companyLogo.files[0];
    let files = [];

    if (buisnessCertificate)
      files.push({ name: "BuisnessCertificate", file: buisnessCertificate });
    if (companyLogo) files.push({ name: "CompanyLogo", file: companyLogo });

    this.storageHandler(files).then((res) => {
      console.log("IN RES");
      if (res) {
        console.log("FILE EXIST", res);
        this.setState(
          (s) => ({ profile: { ...s.profile, downloadUrls: res } }),
          () => {
            console.log("in CALLBACK");
            firestore()
              .collection("Agents")
              .doc(`${this.state.user.uid}`)
              .collection("Profile")
              .doc("Details")
              .set({
                ...this.state.profile,
              })
              .then(() => {
                this.checkAgentProfile(this.state.user);
                this.setState({ btnLoading: false });
              })
              .catch((e) => {
                this.setState({
                  error: {
                    exist: true,
                    msg: e.message,
                  },
                  btnLoading: false,
                });
              });
          }
        );
      } else {
        firestore()
          .collection("Agents")
          .doc(`${this.state.user.uid}`)
          .collection("Profile")
          .doc("Details")
          .set({
            ...this.state.profile,
          })
          .then(() => {
            this.checkAgentProfile(this.state.user);
            this.setState({ btnLoading: false });
          })
          .catch((e) => {
            this.setState({
              error: {
                exist: true,
                msg: e.message,
              },
              btnLoading: false,
            });
          });
      }
    });
  };

  render() {
    console.log(this.state.profile);
    if (this.state.loading) {
      return (
        <div className="text-center p-3">
          <div className="spinner-grow text-primary"></div>
        </div>
      );
    }
    if (this.state.profileExist) {
      return (
        <DisplayProfile
          data={this.state.profile}
          handleEdit={() => this.setState({ profileExist: false })}
        />
      );
    }
    if (this.state.error.exist) {
      return <Error msg={this.state.error.msg} />;
    }
    return (
      <div className="m-0">
        <div className="form-container p-0 text-lg-left container-fluid">
          <div
            className="sticky-top text-left align-items-baseline d-flex bg-light col-12 p-2"
            style={{ zIndex: 1 }}
          >
            <h1>Agent Profile</h1>
            <span className="text-danger mx-2 px-2">
              Please Complete Your Profile
            </span>
          </div>
          <form
            onSubmit={this.handleSubmit}
            className="row justify-content-center justify-content-lg-start mt-2"
          >
            <div className="col-12 p-2 border-color m-2 text-left pl-5">
              <h2 className="btn-text-color">Company Information</h2>
            </div>
            <div className="form-group col-8 col-lg-6 ">
              <div className="w-75 m-auto">
                <label htmlFor="companyName" className="text-left">
                  Company Name<span className="text-danger">*</span>
                </label>
                <input
                  type="name"
                  // required
                  id="companyName"
                  onChange={this.handleChange}
                  value={this.state.profile.companyName}
                  className="form-control p-3"
                  name="companyName"
                  placeholder="Company Name"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="agentEmail" className="text-left">
                  Email<span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  // required
                  id="agentEmail"
                  onChange={this.handleChange}
                  value={this.state.profile.agentEmail}
                  className="form-control p-3"
                  name="agentEmail"
                  placeholder="Email"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="agentWebsite" className="text-left">
                  Website
                </label>
                <input
                  type="url"
                  id="agentWebsite"
                  onChange={this.handleChange}
                  value={this.state.profile.agentWebsite}
                  className="form-control p-3"
                  name="agentWebsite"
                  placeholder="Website"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="fbPageName" className="text-left">
                  Facebook Page Name
                </label>
                <input
                  type="url"
                  id="fbPageName"
                  onChange={this.handleChange}
                  value={this.state.profile.fbPageName}
                  className="form-control p-3"
                  name="fbPageName"
                  placeholder="Facebook"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="igHandle" className="text-left">
                  Instagram Handle
                </label>
                <input
                  type="url"
                  id="igHandle"
                  onChange={this.handleChange}
                  value={this.state.profile.igHandle}
                  className="form-control p-3"
                  name="igHandle"
                  placeholder="Instagram"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="twitterHandle" className="text-left">
                  Twitter Handle
                </label>
                <input
                  type="url"
                  id="twitterHandle"
                  onChange={this.handleChange}
                  value={this.state.profile.twitterHandle}
                  className="form-control p-3"
                  name="twitterHandle"
                  placeholder="Twitter"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="linkedInUrl" className="text-left">
                  Linked Url
                </label>
                <input
                  type="url"
                  id="linkedInUrl"
                  onChange={this.handleChange}
                  value={this.state.profile.linkedInUrl}
                  className="form-control p-3"
                  name="linkedInUrl"
                  placeholder="LinkedIn Url"
                />
              </div>
            </div>
            <div className="col-12 p-2 m-2 border-color text-left pl-5">
              <h2 className="btn-text-color">Contact Information</h2>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="agentSource" className="text-left">
                  Main Source Of Students<span className="text-danger">*</span>
                </label>
                <select
                  className="custom-select"
                  name="agentSource"
                  id="agentSource"
                  // required
                  value={this.state.profile.source}
                  onChange={this.handleChange}
                >
                  <option value="">Main Source Of Students</option>
                  <option value="sourceOne">Source One</option>
                </select>
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="firstName" className="text-left">
                  Legal First Name<span className="text-danger">*</span>
                </label>
                <input
                  type="name"
                  // required
                  id="firstName"
                  onChange={this.handleChange}
                  value={this.state.profile.firstName}
                  className="form-control p-3"
                  name="firstName"
                  placeholder="Legal First Name"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="lastName" className="text-left">
                  Legal Last Name<span className="text-danger">*</span>
                </label>
                <input
                  type="name"
                  // required
                  id="lastName"
                  onChange={this.handleChange}
                  value={this.state.profile.lastName}
                  className="form-control p-3"
                  name="lastName"
                  placeholder="Legal Last Name"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="streetAddress" className="text-left">
                  Street Address<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  // required
                  id="streetAddress"
                  onChange={this.handleChange}
                  value={this.state.profile.streetAddress}
                  className="form-control p-3"
                  name="streetAddress"
                  placeholder="Street Address"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="city" className="text-left">
                  City<span className="text-danger">*</span>
                </label>
                <input
                  type="city"
                  // required
                  id="city"
                  onChange={this.handleChange}
                  value={this.state.profile.city}
                  className="form-control p-3"
                  name="city"
                  placeholder="City"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="state" className="text-left">
                  State<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  // required
                  id="state"
                  onChange={this.handleChange}
                  value={this.state.profile.state}
                  className="form-control p-3"
                  name="state"
                  placeholder="State"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="country" className="text-left">
                  Country<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  // required
                  id="country"
                  onChange={this.handleChange}
                  value={this.state.profile.country}
                  className="form-control p-3"
                  name="country"
                  placeholder="Country"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="postalCode" className="text-left">
                  Postal Code<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="postalCode"
                  // required
                  onChange={this.handleChange}
                  value={this.state.profile.postalCode}
                  className="form-control p-3"
                  name="postalCode"
                  placeholder="Postal Code"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="phoneNumber" className="text-left">
                  Phone<span className="text-danger">*</span>
                </label>
                <input
                  type="cell"
                  id="phoneNumber"
                  // required
                  onChange={this.handleChange}
                  value={this.state.profile.phoneNumber}
                  className="form-control p-3"
                  name="phoneNumber"
                  placeholder="Phone"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="cellNumber" className="text-left">
                  Cell Phone
                </label>
                <input
                  type="cell"
                  id="cellNumber"
                  onChange={this.handleChange}
                  value={this.state.profile.cellNumber}
                  className="form-control p-3"
                  name="cellNumber"
                  placeholder="Cell Number"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="skypeId" className="text-left">
                  Skype ID
                </label>
                <input
                  type="text"
                  id="skypeId"
                  onChange={this.handleChange}
                  value={this.state.profile.skypeId}
                  className="form-control p-3"
                  name="skypeId"
                  placeholder="Cell Number"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="whatsAppId" className="text-left">
                  WhatsApp ID
                </label>
                <input
                  type="text"
                  id="whatsAppId"
                  onChange={this.handleChange}
                  value={this.state.profile.whatsAppId}
                  className="form-control p-3"
                  name="whatsAppId"
                  placeholder="Cell Number"
                />
              </div>
            </div>
            <div className="col-12 p-2 m-2 border-color text-left pl-5">
              <h2 className="btn-text-color">Recruitment Information</h2>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="startYear" className="text-left">
                  When did you start recruiting?
                </label>
                <input
                  type="text"
                  id="startYear"
                  onChange={this.handleChange}
                  value={this.state.profile.startYear}
                  className="form-control p-3"
                  name="startYear"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="servicesOffered" className="text-left">
                  What services do you offer to the clients?
                  <span className="text-danger">*</span>
                </label>
                <textarea
                  type="text"
                  id="servicesOffered"
                  onChange={this.handleChange}
                  value={this.state.profile.servicesOffered}
                  className="form-control p-3"
                  name="servicesOffered"
                  // required
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="institutionsRep" className="text-left">
                  Institution Represented
                </label>
                <textarea
                  type="text"
                  id="institutionsRep"
                  onChange={this.handleChange}
                  value={this.state.profile.institutionsRep}
                  className="form-control p-3"
                  name="institutionsRep"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="recruitFrom" className="text-left">
                  Where do you recruit from?
                </label>
                <Select
                  options={this.state.profile.countries}
                  name="selectFrom"
                  onChange={(e) => {
                    let val = e.map((item) => item.label);
                    this.setState(
                      (s) => ({
                        profile: {
                          ...s.profile,
                          recruitFrom: val,
                        },
                      }),
                      () => console.log(this.state)
                    );
                  }}
                  isMulti
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="eduAssociations" className="text-left">
                  What educational associations or groups does your organization
                  belong to?<span className="text-danger">*</span>
                </label>
                <textarea
                  type="text"
                  // required
                  id="eduAssociations"
                  onChange={this.handleChange}
                  value={this.state.profile.eduAssociations}
                  className="form-control p-3"
                  name="eduAssociations"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="studentsEveryYear" className="text-left">
                  How many students do you send abroad every year?
                </label>
                <select
                  className="custom-select"
                  name="studentsEveryYear"
                  id="studentsEveryYear"
                  value={this.state.profile.studentsEveryYear}
                  onChange={this.handleChange}
                >
                  <option value="">Select..</option>
                  <option value="1-5">1-5</option>
                  <option value="6-20">6-20</option>
                  <option value="21-50">21-50</option>
                  <option value="51-250">51-250</option>
                  <option value="250+">250+</option>
                </select>
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="marketingMethods" className="text-left">
                  Methods For Marketing<span className="text-danger">*</span>
                </label>
                <Select
                  options={[
                    { value: "onlineAdvertising", label: "Online Advertising" },
                    { value: "educationFairs", label: "Education Fairs" },
                    { value: "workshops", label: "Workshops" },
                    { value: "sub_agentNetwork", label: "Sub-Agent Network" },
                    { value: "newspaper", label: "Newspaper/Magazine" },
                    { value: "other", label: "Other" },
                  ]}
                  name="marketingMethods"
                  onChange={(e) => {
                    let val = e.map((item) => item.label);

                    this.setState((s) => ({
                      profile: {
                        ...s.profile,
                        marketingMethods: val,
                      },
                    }));
                  }}
                  isMulti
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="averageFee" className="text-left">
                  Average Service Fee
                </label>
                <select
                  className="custom-select"
                  name="averageFee"
                  id="averageFee"
                  value={this.state.profile.averageFee}
                  onChange={this.handleChange}
                >
                  <option value="">Select..</option>
                  <option value="$0-$200">$0-$200</option>
                  <option value="$200-$500">$200-$500</option>
                  <option value="$500-$1000">$500-$1000</option>
                  <option value="$1000-$2500">$1000-$2500</option>
                  <option value="$2500+">$2500+</option>
                </select>
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="studentsEveryYearFT" className="text-left">
                  Estimate of students you will refer to FutureTie every year
                </label>
                <select
                  className="custom-select"
                  name="studentsEveryYearFT"
                  id="studentsEveryYearFT"
                  value={this.state.profile.studentsEveryYear}
                  onChange={this.handleChange}
                >
                  <option value="">Select..</option>
                  <option value="1-5">1-5</option>
                  <option value="6-20">6-20</option>
                  <option value="21-50">21-50</option>
                  <option value="51-250">51-250</option>
                  <option value="250+">250+</option>
                </select>
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="refName" className="text-left">
                  Reference Name
                </label>
                <input
                  type="text"
                  id="refName"
                  onChange={this.handleChange}
                  value={this.state.profile.refName}
                  className="form-control p-3"
                  name="refName"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="refInstName" className="text-left">
                  Reference Institution Name
                </label>
                <input
                  type="text"
                  id="refInstName"
                  onChange={this.handleChange}
                  value={this.state.profile.refInstName}
                  className="form-control p-3"
                  name="refInstName"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="refEmail" className="text-left">
                  Reference Buisness Email
                </label>
                <input
                  type="email"
                  id="refEmail"
                  onChange={this.handleChange}
                  value={this.state.profile.refEmail}
                  className="form-control p-3"
                  name="refEmail"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="refPhone" className="text-left">
                  Reference Phone Number
                </label>
                <input
                  type="cell"
                  id="refPhone"
                  onChange={this.handleChange}
                  value={this.state.profile.refPhone}
                  className="form-control p-3"
                  name="refPhone"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="refWebsite" className="text-left">
                  Reference Websites
                </label>
                <input
                  type="url"
                  id="refWebsite"
                  onChange={this.handleChange}
                  value={this.state.profile.refWebsite}
                  className="form-control p-3"
                  name="refWebsite"
                />
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="companyLogo" className="">
                  Company Logo
                </label>
                <input
                  type="file"
                  className="form-control-file"
                  id="companyLogo"
                  style={{
                    textTransform: "capitalize",
                  }}
                  name="companyLogo"
                  accept="image/*"
                  onChange={this.hanldeFileChange}
                ></input>
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto">
                <label htmlFor="b_certificate" className="">
                  Buisness Certificate
                </label>
                <input
                  type="file"
                  className="form-control-file"
                  id="b_certificate"
                  style={{
                    textTransform: "capitalize",
                  }}
                  name="b_certificate"
                  accept=".pdf"
                  onChange={this.hanldeFileChange}
                ></input>
              </div>
            </div>
            <div className="form-group col-8 col-lg-6">
              <div className="w-75 m-auto row align-items-center">
                <input
                  type="checkbox"
                  id="verified"
                  onChange={(e) => {
                    let check = e.target.checked;
                    this.setState({ verified: check });
                  }}
                  // required
                  value={this.state.profile.verified}
                  className="form-control p-5 m-2 col-1"
                  name="verified"
                />
                <label htmlFor="verified" className="col px-1 text-left">
                  I declare that the information contained in this application
                  and all supporting documentation is true and correct.
                  <span className="text-danger">*</span>
                </label>
              </div>
            </div>
            <div className="col-12 text-center">
              {this.state.verified ? null : (
                <h3 className="p-2 text-danger">
                  Check the above box to continue
                </h3>
              )}
              <button
                className="btn btn-primary"
                type="submit"
                disabled={this.state.btnLoading || !this.state.verified}
              >
                {this.state.btnLoading ? (
                  <div className="spinner-border"></div>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
